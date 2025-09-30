const { ethers } = require("hardhat");

async function main() {
    const [user] = await ethers.getSigners();
    const Demo = await ethers.getContractFactory("EIP712Demo");
    const demo = await Demo.deploy();
    await demo.waitForDeployment();
    console.log("EIP712Demo deployed to:", demo.target);
    console.log("User address:", user.address);
    const domain = {
        name: "EIP712Demo",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: demo.target,
    };

    const types = {
        Mail: [
            { name: "to", type: "address" },
            { name: "message", type: "string" }
        ]
    };

    const mail = {
        to: "0x1234567890123456789012345678901234567890",
        message: "Hello EIP-712!"
    };

    const signature = await user.signTypedData(domain, types, mail);
    console.log("Signature:", signature);

    const recovered = await demo.verify(mail, signature);
    console.log("Recovered signer:", recovered);
    console.log("Matches user:", recovered.toLowerCase() === user.address.toLowerCase());
}

main();
