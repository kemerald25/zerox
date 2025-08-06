// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TicTacToeScoreboard {
    struct Score {
        uint256 wins;
        uint256 losses;
        uint256 draws;
    }

    mapping(address => Score) public scores;
    event GameResult(address player, string result);

    function recordGame(string memory result) external {
        Score storage playerScore = scores[msg.sender];
        
        if (keccak256(bytes(result)) == keccak256(bytes("win"))) {
            playerScore.wins += 1;
        } else if (keccak256(bytes(result)) == keccak256(bytes("loss"))) {
            playerScore.losses += 1;
        } else if (keccak256(bytes(result)) == keccak256(bytes("draw"))) {
            playerScore.draws += 1;
        }

        emit GameResult(msg.sender, result);
    }

    function getScore(address player) external view returns (Score memory) {
        return scores[player];
    }
}