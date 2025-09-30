// scripts/deploy.js
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    try {
        const [deployer, user] = await ethers.getSigners();
        console.log("Deployer:", deployer.address);
        console.log("User (owner):", user.address);
        // console.log("Relayer:", relayer.address);
        // 1) Deploy EntryPoint
        // const EntryPoint = await ethers.getContractFactory("EntryPoint", deployer);
        // const entryPoint = await EntryPoint.deploy();
        // await entryPoint.waitForDeployment();
        // console.log("EntryPoint:", entryPoint.target);

        // 2) Deploy SimpleAccount (owner = user.address, entryPoint = entryPoint.address)
        // const SmartWallet = await ethers.getContractFactory("SmartWallet", deployer);
        // const account = await SmartWallet.deploy(user.address, process.env.ENTRY_POINT);
        // await account.waitForDeployment();
        // console.log("SMart wallet deployed:", account.target);
        // return
        // 3) Deploy Recipient
        // const Target = await ethers.getContractFactory("Target", deployer);
        // const target = await Target.deploy();
        // await target.waitForDeployment();
        // console.log("Target:", target.target);

        // Fund account with some ETH so it can do value transfers if needed (optional)
        // send 0.01 ETH
        const tx = await deployer.sendTransaction({ to: process.env.SMART_WALLET, value: ethers.parseEther("1") });
        await tx.wait();
        console.log("Funded account with 1 ETH");
        return

    } catch (error) {
        console.error(error);
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
