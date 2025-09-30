// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract EIP712Demo is EIP712 {
    string private constant SIGNING_DOMAIN = "EIP712Demo";
    string private constant SIGNATURE_VERSION = "1";

    struct Mail {
        address to;
        string message;
    }

    constructor() EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {}

    function verify(Mail calldata mail, bytes calldata signature) public view returns (address) {
        bytes32 structHash = keccak256(abi.encode(
            keccak256("Mail(address to,string message)"),
            mail.to,
            keccak256(bytes(mail.message))
        ));

        bytes32 digest = _hashTypedDataV4(structHash);
        return ECDSA.recover(digest, signature);
    }
}
