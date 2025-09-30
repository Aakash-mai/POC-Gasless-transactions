// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * Simple single-owner smart account.
 *
 * - owner: single EOA allowed to sign operations
 * - nonce: simple uint256 nonce (incremented on successful validation)
 * - entryPoint: allowed EntryPoint address that can call execute()
 *
 * validateUserOp(reqHash, signature) verifies signature equals owner and increments nonce.
 * execute(callData) only callable by EntryPoint and performs a low-level call encoded in callData.
 *
 * callData format we use in this POC (ABI-encoded):
 *    abi.encode(address target, uint256 value, bytes data)
 *
 * The account will perform: (bool success, ) = target.call{value: value}(data);
 */
contract SmartWallet {
  using ECDSA for bytes32;

    address public owner;
    address public entryPoint;
    uint256 public nonce;

    event Executed(address indexed target, uint256 value, bool success);

    modifier onlyEntryPoint() {
        require(msg.sender == entryPoint, "Only EntryPoint");
        _;
    }

    constructor(address _owner, address _entryPoint) {
        owner = _owner;
        entryPoint = _entryPoint;
        nonce = 0;
    }

    // Validate the EIP-712 digest signature
    // reqDigest is the EIP-712 digest produced by EntryPoint (i.e., _hashTypedDataV4(structHash))
    function validateUserOp(bytes32 reqDigest, bytes calldata signature) external returns (bool) {
        address recovered = ECDSA.recover(reqDigest, signature);
        if (recovered != owner) return false;

        // consume nonce (very simple)
        nonce += 1;
        return true;
    }

    // Called by EntryPoint to execute the user's desired action.
    // callData = abi.encode(address target, uint256 value, bytes data)
    function execute(bytes calldata callData) external onlyEntryPoint {
        (address target, uint256 value, bytes memory data) = abi.decode(callData, (address, uint256, bytes));
        (bool success, ) = target.call{value: value}(data);
        emit Executed(target, value, success);
    }

    receive() external payable {}
}
