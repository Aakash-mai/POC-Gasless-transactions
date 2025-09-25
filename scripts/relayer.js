/**
 * Simple relayer script that:
 *  - deploys contracts (if not deployed)
 *  - builds a ForwardRequest signed by user
 *  - relayer sends forwarder.execute(...)
 *
 * Usage:
 *  npx hardhat run scripts/relayer.js --network <network>
 *
 * Note: For local Hardhat node, use `npx hardhat node` in one terminal and run with
 * `npx hardhat run scripts/relayer.js --network localhost` in another, or just run with hardhat's in-process network.
 */

const { ethers } = require("hardhat");

async function main() {
    const [deployer, user, relayer] = await ethers.getSigners();

    // deploy 
    const Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await Forwarder.deploy("MyForwarder");
    await forwarder.waitForDeployment();
    const TestContract = await ethers.getContractFactory("Test");
    const recipient = await TestContract.deploy(await forwarder.getAddress());
    await recipient.waitForDeployment();

    console.log("Forwarder deployed:", await forwarder.getAddress());
    console.log("Recipient deployed:", await recipient.getAddress());
    console.log("User address:", user.address);
    console.log("Relayer address:", relayer.address);
    //initial balance of user and relayer
    console.log("User balance before Meta transaction:", ethers.formatEther(await user.provider.getBalance(user.address)));
    console.log("Relayer balance before Meta transaction:", ethers.formatEther(await relayer.provider.getBalance(relayer.address)));

    // prepare request
    const data = recipient.interface.encodeFunctionData("setMessage", ["Hello ! This is a Meta Tx"]);
    const nonce = await forwarder.nonces(user.address);
    console.log("User nonce:", nonce.toString());
    const request = {
        from: user.address,
        to: recipient.target,
        value: 0,
        gas: 1_000_000,
        nonce: parseInt(nonce.toString()),
        deadline: Math.floor(Date.now() / 1000) + 3600,// 1 hour from now
        data: data,
    };
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const domain = {
        name: "MyForwarder",
        version: "1",
        chainId: chainId,
        verifyingContract: forwarder.target
    };
    const types = {
        ForwardRequest: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "gas", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint48" },
            { name: "data", type: "bytes" }
        ]
    };

    // user signs typed data
    const signature = await user.signTypedData(domain, types, request);

    const requestWithSignature = {
        from: request.from,
        to: request.to,
        value: request.value,
        gas: request.gas,
        deadline: request.deadline,
        data: request.data,
        signature: signature
    };

    // relayer verifies off-chain (optional)
    const recovered = ethers.verifyTypedData(domain, types, request, signature);
    if (recovered.toLowerCase() !== user.address.toLowerCase()) {
        throw new Error("Signature verification failed off-chain");
    }

    // relayer executes the forward request
    console.log("Relayer sending execute...");
    const tx = await forwarder.connect(relayer).execute(requestWithSignature, { value: request.value, gasLimit: request.gas });
    const receipt = await tx.wait();
    console.log("Meta-tx mined in tx:", receipt.hash);

    // show stored state
    console.log("lastSender:", await recipient.lastSender());
    console.log("lastMsg:", await recipient.lastMsg());

    //final balance of user and relayer
    console.log("User balance after meta transaction:", ethers.formatEther(await user.provider.getBalance(user.address)));
    console.log("Relayer balance after meta transaction:", ethers.formatEther(await relayer.provider.getBalance(relayer.address)));
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
