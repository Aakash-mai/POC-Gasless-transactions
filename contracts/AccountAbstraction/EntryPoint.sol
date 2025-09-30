// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

interface ISimpleAccount {
    function validateUserOp(bytes32 reqDigest, bytes calldata signature) external returns (bool);
    function execute(bytes calldata callData) external;
}

contract EntryPoint is EIP712 {
    event UserOpEvent(address indexed sender, bytes32 reqHash, bool success);

    // Type hash for EIP-712 struct: UserOp(address sender,uint256 nonce,bytes32 dataHash)
    bytes32 private constant _USEROP_TYPEHASH =
        keccak256("UserOp(address sender,uint256 nonce,bytes32 dataHash)");

    struct UserOperation {
        address sender;
        uint256 nonce;
        bytes callData;
        uint256 callGas;
        bytes signature;
    }

    constructor() EIP712("EntryPoint", "1") {}

    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external payable {
        for (uint256 i = 0; i < ops.length; ++i) {
            UserOperation calldata op = ops[i];

            // compute dataHash = keccak256(callData)
            bytes32 dataHash = keccak256(op.callData);

            // compute struct hash according to EIP-712 type
            bytes32 structHash = keccak256(abi.encode(
                _USEROP_TYPEHASH,
                op.sender,
                op.nonce,
                dataHash
            ));

            // compute EIP-712 digest/domain hash
            bytes32 digest = _hashTypedDataV4(structHash);

            bool validated;
            try ISimpleAccount(op.sender).validateUserOp(digest, op.signature) returns (bool ok) {
                validated = ok;
            } catch {
                validated = false;
            }

            if (!validated) {
                emit UserOpEvent(op.sender, digest, false);
                continue;
            }

            // execute account call
            bool success;
            try ISimpleAccount(op.sender).execute(op.callData) {
                success = true;
            } catch {
                success = false;
            }

            emit UserOpEvent(op.sender, digest, success);
        }
    }
}
