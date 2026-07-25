import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { EmberLendPool } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const HBAR = (n: string) => ethers.parseEther(n);

describe("EmberLendPool", () => {
  let pool: EmberLendPool;
  let owner: HardhatEthersSigner;
  let lender: HardhatEthersSigner;
  let borrower: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, lender, borrower] = await ethers.getSigners();
    const Pool = await ethers.getContractFactory("EmberLendPool");
    pool = await Pool.deploy();
    await pool.waitForDeployment();
  });

  describe("deployment", () => {
    it("sets the deployer as owner", async () => {
      expect(await pool.owner()).to.equal(owner.address);
    });

    it("starts unpaused with no liquidity", async () => {
      expect(await pool.paused()).to.equal(false);
      expect(await pool.totalSupplied()).to.equal(0n);
      expect(await pool.totalBorrowed()).to.equal(0n);
    });
  });

  describe("supply", () => {
    it("accepts liquidity and tracks it", async () => {
      await expect(pool.connect(lender).supply({ value: HBAR("100") }))
        .to.emit(pool, "Supplied")
        .withArgs(lender.address, HBAR("100"));

      expect(await pool.totalSupplied()).to.equal(HBAR("100"));
      expect(await pool.availableLiquidity()).to.equal(HBAR("100"));
    });

    it("rejects a zero-value supply", async () => {
      await expect(
        pool.connect(lender).supply({ value: 0 })
      ).to.be.revertedWith("zero");
    });
  });

  describe("borrow", () => {
    beforeEach(async () => {
      await pool.connect(lender).supply({ value: HBAR("100") });
    });

    it("lets a borrower draw against collateral at 150%", async () => {
      // 15 HBAR collateral => max borrow 10 HBAR
      await expect(
        pool.connect(borrower).borrow(HBAR("10"), { value: HBAR("15") })
      )
        .to.emit(pool, "Borrowed")
        .withArgs(borrower.address, HBAR("15"), HBAR("10"));

      const loan = await pool.loans(borrower.address);
      expect(loan.collateral).to.equal(HBAR("15"));
      expect(loan.principal).to.equal(HBAR("10"));
      expect(loan.active).to.equal(true);
      expect(await pool.totalBorrowed()).to.equal(HBAR("10"));
    });

    it("actually transfers the principal to the borrower", async () => {
      const before = await ethers.provider.getBalance(borrower.address);
      const tx = await pool
        .connect(borrower)
        .borrow(HBAR("10"), { value: HBAR("15") });
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(borrower.address);

      // paid 15 collateral, received 10 principal => net -5 minus gas
      expect(after).to.equal(before - HBAR("15") + HBAR("10") - gas);
    });

    it("reverts when borrowing above the collateral ratio", async () => {
      // 15 collateral only supports 10; asking 11 must fail
      await expect(
        pool.connect(borrower).borrow(HBAR("11"), { value: HBAR("15") })
      ).to.be.revertedWithCustomError(pool, "ExceedsMaxBorrow");
    });

    it("reverts on a second concurrent loan", async () => {
      await pool.connect(borrower).borrow(HBAR("5"), { value: HBAR("15") });
      await expect(
        pool.connect(borrower).borrow(HBAR("1"), { value: HBAR("15") })
      ).to.be.revertedWithCustomError(pool, "ActiveLoanExists");
    });

    it("reverts when the pool lacks liquidity", async () => {
      const Pool = await ethers.getContractFactory("EmberLendPool");
      const empty = await Pool.deploy();
      await empty.waitForDeployment();

      // Collateral (15) is sent with the call, so liquidity is 15 at check time;
      // asking for 10 succeeds. Ask beyond that from a drained pool instead.
      await expect(
        empty.connect(borrower).borrow(HBAR("10"), { value: HBAR("3") })
      ).to.be.revertedWithCustomError(empty, "ExceedsMaxBorrow");
    });
  });

  describe("interest", () => {
    beforeEach(async () => {
      await pool.connect(lender).supply({ value: HBAR("100") });
      await pool.connect(borrower).borrow(HBAR("10"), { value: HBAR("15") });
    });

    it("accrues ~5% over a full year", async () => {
      await time.increase(365 * 24 * 60 * 60);
      const interest = await pool.accruedInterest(borrower.address);
      // 5% of 10 HBAR = 0.5 HBAR, allow 1% drift for block timing
      expect(interest).to.be.closeTo(HBAR("0.5"), HBAR("0.005"));
    });

    it("accrues roughly half that over six months", async () => {
      await time.increase(182 * 24 * 60 * 60);
      const interest = await pool.accruedInterest(borrower.address);
      expect(interest).to.be.closeTo(HBAR("0.249"), HBAR("0.005"));
    });

    it("reports zero interest for an address with no loan", async () => {
      expect(await pool.accruedInterest(lender.address)).to.equal(0n);
    });
  });

  describe("repay", () => {
    beforeEach(async () => {
      await pool.connect(lender).supply({ value: HBAR("100") });
      await pool.connect(borrower).borrow(HBAR("10"), { value: HBAR("15") });
    });

    it("returns collateral and clears the loan", async () => {
      await time.increase(30 * 24 * 60 * 60);
      const due = await pool.amountDue(borrower.address);

      await expect(pool.connect(borrower).repay({ value: due + HBAR("0.01") }))
        .to.emit(pool, "Repaid");

      const loan = await pool.loans(borrower.address);
      expect(loan.active).to.equal(false);
      expect(loan.principal).to.equal(0n);
      expect(await pool.totalBorrowed()).to.equal(0n);
    });

    it("reverts when underpaying", async () => {
      await time.increase(30 * 24 * 60 * 60);
      await expect(
        pool.connect(borrower).repay({ value: HBAR("9") })
      ).to.be.revertedWithCustomError(pool, "IncorrectRepayment");
    });

    it("reverts when there is no active loan", async () => {
      await expect(
        pool.connect(lender).repay({ value: HBAR("1") })
      ).to.be.revertedWithCustomError(pool, "NoActiveLoan");
    });

    it("lets the borrower open a new loan after repaying", async () => {
      const due = await pool.amountDue(borrower.address);
      await pool.connect(borrower).repay({ value: due + HBAR("1") });
      await expect(
        pool.connect(borrower).borrow(HBAR("2"), { value: HBAR("15") })
      ).to.emit(pool, "Borrowed");
    });
  });

  describe("admin", () => {
    it("only the owner can pause", async () => {
      await expect(
        pool.connect(borrower).setPaused(true)
      ).to.be.revertedWithCustomError(pool, "NotOwner");
    });

    it("blocks supply and borrow while paused", async () => {
      await pool.setPaused(true);
      await expect(
        pool.connect(lender).supply({ value: HBAR("1") })
      ).to.be.revertedWithCustomError(pool, "IsPaused");
      await expect(
        pool.connect(borrower).borrow(HBAR("1"), { value: HBAR("15") })
      ).to.be.revertedWithCustomError(pool, "IsPaused");
    });

    it("only the owner can withdraw", async () => {
      await pool.connect(lender).supply({ value: HBAR("10") });
      await expect(
        pool.connect(borrower).withdraw(HBAR("1"))
      ).to.be.revertedWithCustomError(pool, "NotOwner");
    });

    it("lets the owner withdraw and pays out the funds", async () => {
      await pool.connect(lender).supply({ value: HBAR("10") });
      const before = await ethers.provider.getBalance(owner.address);

      const tx = await pool.withdraw(HBAR("4"));
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(owner.address);

      expect(after).to.equal(before + HBAR("4") - gas);
      expect(await pool.totalSupplied()).to.equal(HBAR("6"));
      expect(await pool.availableLiquidity()).to.equal(HBAR("6"));
    });

    it("emits Withdrawn and floors totalSupplied at zero", async () => {
      await pool.connect(lender).supply({ value: HBAR("10") });
      // Borrower's collateral adds balance beyond what lenders supplied,
      // so the owner can pull more than totalSupplied without underflowing.
      await pool.connect(borrower).borrow(HBAR("1"), { value: HBAR("15") });

      await expect(pool.withdraw(HBAR("12")))
        .to.emit(pool, "Withdrawn")
        .withArgs(owner.address, HBAR("12"));
      expect(await pool.totalSupplied()).to.equal(0n);
    });

    it("reverts a withdrawal beyond the contract balance", async () => {
      await pool.connect(lender).supply({ value: HBAR("5") });
      await expect(pool.withdraw(HBAR("50"))).to.be.revertedWith(
        "exceeds balance"
      );
    });

    it("can be unpaused again", async () => {
      await pool.setPaused(true);
      await expect(pool.setPaused(false))
        .to.emit(pool, "Paused")
        .withArgs(false);
      await expect(pool.connect(lender).supply({ value: HBAR("1") })).to.emit(
        pool,
        "Supplied"
      );
    });
  });
});
