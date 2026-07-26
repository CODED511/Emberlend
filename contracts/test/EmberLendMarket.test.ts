import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { EmberLendMarket, TestToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const NATIVE = ethers.ZeroAddress;
const WAD = 10n ** 18n;
const NO_DEBT = 2n ** 256n - 1n;

/** USD prices are 8 dp, matching the contract. */
const usd = (n: string) => ethers.parseUnits(n, 8);
/** Native amounts are 18 dp on the Hardhat EVM. */
const nat = (n: string) => ethers.parseEther(n);
/** Test tokens below use 6 dp. */
const tok = (n: string) => ethers.parseUnits(n, 6);

describe("EmberLendMarket", () => {
  let market: EmberLendMarket;
  let usdc: TestToken;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    const Market = await ethers.getContractFactory("EmberLendMarket");
    market = await Market.deploy();
    await market.waitForDeployment();

    const Token = await ethers.getContractFactory("TestToken");
    usdc = await Token.deploy("USD Coin", "USDC", 6, 1000);
    await usdc.waitForDeployment();

    // HBAR at $0.20, 60% LTV, 75% liquidation threshold.
    await market.listMarket(NATIVE, 18, usd("0.20"), 120, 500, 6000, 7500);
    // USDC at $1.00, 80% LTV, 85% threshold.
    await market.listMarket(
      await usdc.getAddress(),
      6,
      usd("1"),
      450,
      700,
      8000,
      8500,
    );
  });

  async function fundUsdc(who: HardhatEthersSigner) {
    await usdc.connect(who).faucet();
    await usdc.connect(who).approve(await market.getAddress(), ethers.MaxUint256);
  }

  describe("listing", () => {
    it("registers both markets", async () => {
      expect(await market.assetCount()).to.equal(2n);
      expect(await market.allAssets()).to.deep.equal([
        NATIVE,
        await usdc.getAddress(),
      ]);
    });

    it("rejects an LTV above the liquidation threshold", async () => {
      await expect(
        market.listMarket(alice.address, 18, usd("1"), 0, 0, 9000, 8000),
      ).to.be.revertedWith("ltv > threshold");
    });

    it("only the owner can list", async () => {
      await expect(
        market
          .connect(alice)
          .listMarket(alice.address, 18, usd("1"), 0, 0, 100, 200),
      ).to.be.revertedWithCustomError(market, "NotOwner");
    });
  });

  describe("supply", () => {
    it("credits the supplier and enables collateral by default", async () => {
      await expect(market.connect(alice).supply(NATIVE, 0, { value: nat("100") }))
        .to.emit(market, "Supplied")
        .withArgs(alice.address, NATIVE, nat("100"));

      expect(await market.supplied(alice.address, NATIVE)).to.equal(nat("100"));
      expect(await market.collateralOn(alice.address, NATIVE)).to.equal(true);
    });

    it("tracks suppliers separately", async () => {
      await market.connect(alice).supply(NATIVE, 0, { value: nat("10") });
      await market.connect(bob).supply(NATIVE, 0, { value: nat("25") });

      expect(await market.supplied(alice.address, NATIVE)).to.equal(nat("10"));
      expect(await market.supplied(bob.address, NATIVE)).to.equal(nat("25"));
      const m = await market.markets(NATIVE);
      expect(m.totalSupplied).to.equal(nat("35"));
    });

    it("accepts ERC-20 supply via transferFrom", async () => {
      await fundUsdc(alice);
      await market.connect(alice).supply(await usdc.getAddress(), tok("500"));
      expect(
        await market.supplied(alice.address, await usdc.getAddress()),
      ).to.equal(tok("500"));
    });

    it("rejects native value sent alongside a token supply", async () => {
      await fundUsdc(alice);
      await expect(
        market
          .connect(alice)
          .supply(await usdc.getAddress(), tok("1"), { value: nat("1") }),
      ).to.be.revertedWithCustomError(market, "NativeValueMismatch");
    });

    it("rejects an unlisted asset", async () => {
      await expect(
        market.connect(alice).supply(bob.address, 1),
      ).to.be.revertedWithCustomError(market, "NotListed");
    });
  });

  describe("withdraw", () => {
    beforeEach(async () => {
      await market.connect(alice).supply(NATIVE, 0, { value: nat("100") });
    });

    it("returns funds and reduces the position", async () => {
      const before = await ethers.provider.getBalance(alice.address);
      const tx = await market.connect(alice).withdraw(NATIVE, nat("40"));
      const r = await tx.wait();
      const after = await ethers.provider.getBalance(alice.address);

      expect(after).to.equal(before + nat("40") - r!.gasUsed * r!.gasPrice);
      expect(await market.supplied(alice.address, NATIVE)).to.equal(nat("60"));
    });

    it("allows a full withdrawal with no debt", async () => {
      await market.connect(alice).withdraw(NATIVE, nat("100"));
      expect(await market.supplied(alice.address, NATIVE)).to.equal(0n);
    });

    it("reverts when withdrawing more than supplied", async () => {
      await expect(
        market.connect(alice).withdraw(NATIVE, nat("101")),
      ).to.be.revertedWithCustomError(market, "InsufficientBalance");
    });

    it("blocks a withdrawal that would undercollateralize the account", async () => {
      await fundUsdc(bob);
      await market.connect(bob).supply(await usdc.getAddress(), tok("1000"));

      // $20 collateral at 60% LTV supports $12; borrow $10 of USDC.
      await market.connect(alice).borrow(await usdc.getAddress(), tok("10"));

      await expect(
        market.connect(alice).withdraw(NATIVE, nat("90")),
      ).to.be.revertedWithCustomError(market, "Undercollateralized");
    });
  });

  describe("borrow", () => {
    beforeEach(async () => {
      await fundUsdc(bob);
      await market.connect(bob).supply(await usdc.getAddress(), tok("1000"));
      // Alice posts 100 HBAR = $20 collateral.
      await market.connect(alice).supply(NATIVE, 0, { value: nat("100") });
    });

    it("lends against collateral", async () => {
      await expect(
        market.connect(alice).borrow(await usdc.getAddress(), tok("10")),
      )
        .to.emit(market, "Borrowed")
        .withArgs(alice.address, await usdc.getAddress(), tok("10"));

      // Alice held no USDC before borrowing.
      expect(await usdc.balanceOf(alice.address)).to.equal(tok("10"));
    });

    it("reverts past borrowing power", async () => {
      // $20 × 60% LTV = $12 of power; $13 must fail. Note this is stricter
      // than the health factor, which would still read above 1 at $13.
      await expect(
        market.connect(alice).borrow(await usdc.getAddress(), tok("13")),
      ).to.be.revertedWithCustomError(market, "Undercollateralized");
    });

    it("leaves a buffer between borrowing power and liquidation", async () => {
      // Borrow the full $12 of power, then confirm health is comfortably
      // above 1 — $15 adjusted collateral ÷ $12 debt = 1.25.
      await market.connect(alice).borrow(await usdc.getAddress(), tok("12"));
      const hf = await market.healthFactor(alice.address);
      expect(hf).to.be.gt(WAD);
      expect(hf).to.be.closeTo((125n * WAD) / 100n, WAD / 100n);
    });

    it("reverts when the market lacks liquidity", async () => {
      await expect(
        market.connect(alice).borrow(await usdc.getAddress(), tok("5000")),
      ).to.be.revertedWithCustomError(market, "InsufficientLiquidity");
    });

    it("ignores collateral the user has switched off", async () => {
      await market.connect(alice).setCollateral(NATIVE, false);
      await expect(
        market.connect(alice).borrow(await usdc.getAddress(), tok("1")),
      ).to.be.revertedWithCustomError(market, "Undercollateralized");
    });
  });

  describe("health factor", () => {
    beforeEach(async () => {
      await fundUsdc(bob);
      await market.connect(bob).supply(await usdc.getAddress(), tok("1000"));
      await market.connect(alice).supply(NATIVE, 0, { value: nat("100") });
    });

    it("is infinite with no debt", async () => {
      expect(await market.healthFactor(alice.address)).to.equal(NO_DEBT);
    });

    it("matches collateral × threshold ÷ debt", async () => {
      // $20 collateral × 75% threshold = $15 adjusted; borrow $10.
      await market.connect(alice).borrow(await usdc.getAddress(), tok("10"));
      const hf = await market.healthFactor(alice.address);
      expect(hf).to.be.closeTo((15n * WAD) / 10n, WAD / 1000n); // 1.5
    });

    it("falls when the collateral price drops", async () => {
      await market.connect(alice).borrow(await usdc.getAddress(), tok("10"));
      const before = await market.healthFactor(alice.address);

      await market.setPrice(NATIVE, usd("0.10")); // halve HBAR
      const after = await market.healthFactor(alice.address);

      expect(after).to.be.lt(before);
      expect(after).to.be.closeTo((75n * WAD) / 100n, WAD / 1000n); // 0.75
    });

    it("reports borrowable power net of existing debt", async () => {
      await market.connect(alice).borrow(await usdc.getAddress(), tok("5"));
      const d = await market.accountData(alice.address);
      // $20 × 60% = $12 power, minus $5 debt => $7 left.
      expect(d.borrowableUsd).to.be.closeTo(usd("7"), usd("0.01"));
      expect(d.debtUsd).to.be.closeTo(usd("5"), usd("0.01"));
    });
  });

  describe("interest", () => {
    beforeEach(async () => {
      await fundUsdc(bob);
      await market.connect(bob).supply(await usdc.getAddress(), tok("1000"));
      await market.connect(alice).supply(NATIVE, 0, { value: nat("100") });
      await market.connect(alice).borrow(await usdc.getAddress(), tok("10"));
    });

    it("accrues ~7% APR over a year", async () => {
      await time.increase(365 * 24 * 60 * 60);
      const owed = await market.borrowBalance(
        alice.address,
        await usdc.getAddress(),
      );
      expect(owed).to.be.closeTo(tok("10.7"), tok("0.01"));
    });

    it("erodes the health factor as interest accrues", async () => {
      const before = await market.healthFactor(alice.address);
      await time.increase(365 * 24 * 60 * 60);
      expect(await market.healthFactor(alice.address)).to.be.lt(before);
    });
  });

  describe("repay", () => {
    beforeEach(async () => {
      await fundUsdc(bob);
      await market.connect(bob).supply(await usdc.getAddress(), tok("1000"));
      await market.connect(alice).supply(NATIVE, 0, { value: nat("100") });
      await fundUsdc(alice);
      await market.connect(alice).borrow(await usdc.getAddress(), tok("10"));
    });

    it("clears the debt", async () => {
      await time.increase(30 * 24 * 60 * 60);
      const owed = await market.borrowBalance(
        alice.address,
        await usdc.getAddress(),
      );
      await market.connect(alice).repay(await usdc.getAddress(), owed + tok("1"));
      expect(
        await market.borrowBalance(alice.address, await usdc.getAddress()),
      ).to.equal(0n);
    });

    it("accepts a partial repayment", async () => {
      await market.connect(alice).repay(await usdc.getAddress(), tok("4"));
      const owed = await market.borrowBalance(
        alice.address,
        await usdc.getAddress(),
      );
      expect(owed).to.be.closeTo(tok("6"), tok("0.01"));
    });

    it("reverts with nothing owed", async () => {
      await expect(
        market.connect(bob).repay(await usdc.getAddress(), tok("1")),
      ).to.be.revertedWithCustomError(market, "NoDebt");
    });
  });

  describe("admin", () => {
    it("blocks actions while paused", async () => {
      await market.setPaused(true);
      await expect(
        market.connect(alice).supply(NATIVE, 0, { value: nat("1") }),
      ).to.be.revertedWithCustomError(market, "IsPaused");
    });

    it("only the owner can set a price", async () => {
      await expect(
        market.connect(alice).setPrice(NATIVE, usd("1")),
      ).to.be.revertedWithCustomError(market, "NotOwner");
    });
  });

  describe("faucet", () => {
    it("hands out tokens and enforces a cooldown", async () => {
      await usdc.connect(alice).faucet();
      expect(await usdc.balanceOf(alice.address)).to.equal(tok("1000"));
      await expect(
        usdc.connect(alice).faucet(),
      ).to.be.revertedWithCustomError(usdc, "FaucetCooldown");
    });

    it("allows another draw after the cooldown", async () => {
      await usdc.connect(alice).faucet();
      await time.increase(3601);
      await usdc.connect(alice).faucet();
      expect(await usdc.balanceOf(alice.address)).to.equal(tok("2000"));
    });
  });
});
