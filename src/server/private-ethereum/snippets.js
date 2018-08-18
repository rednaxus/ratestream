var mining_threads = 1


function checkWork2() {
    if (eth.getBlock("pending").transactions.length > 0) {
        if (eth.mining) return;
        console.log("== Pending transactions! Mining...");
        miner.start(mining_threads);
    } else {
        miner.stop();
        console.log("== No transactions! Mining stopped.");
    }
}

eth.filter("latest", function(err, block) { checkWork2(); });
eth.filter("pending", function(err, block) { checkWork2(); });

checkWork2();


function checkAllBalances() { 
  var i =0; 
  eth.accounts.forEach( function(e){
    console.log("  eth.accounts["+i+"]: " +  e + " \tbalance: " + web3.fromWei(eth.getBalance(e), "ether") + " ether"); 
    i++; 
  })
};

function getTransactionsByAccount(myaccount, startBlockNumber, endBlockNumber) {
  if (endBlockNumber == null) {
    endBlockNumber = eth.blockNumber;
    console.log("Using endBlockNumber: " + endBlockNumber);
  }
  if (startBlockNumber == null) {
    startBlockNumber = endBlockNumber - 1000;
    console.log("Using startBlockNumber: " + startBlockNumber);
  }
  console.log("Searching for transactions to/from account \"" + myaccount + "\" within blocks "  + startBlockNumber + " and " + endBlockNumber);

  for (var i = startBlockNumber; i <= endBlockNumber; i++) {
    if (i % 1000 == 0) {
      console.log("Searching block " + i);
    }
    var block = eth.getBlock(i, true);
    if (block != null && block.transactions != null) {
      block.transactions.forEach( function(e) {
        if (myaccount == "*" || myaccount == e.from || myaccount == e.to) {
          console.log("  tx hash          : " + e.hash + "\n"
            + "   nonce           : " + e.nonce + "\n"
            + "   blockHash       : " + e.blockHash + "\n"
            + "   blockNumber     : " + e.blockNumber + "\n"
            + "   transactionIndex: " + e.transactionIndex + "\n"
            + "   from            : " + e.from + "\n" 
            + "   to              : " + e.to + "\n"
            + "   value           : " + e.value + "\n"
            + "   time            : " + block.timestamp + " " + new Date(block.timestamp * 1000).toGMTString() + "\n"
            + "   gasPrice        : " + e.gasPrice + "\n"
            + "   gas             : " + e.gas + "\n"
            + "   input           : " + e.input);
        }
      })
    }
  }
}

function printTransaction(txHash) {
  var tx = eth.getTransaction(txHash);
  if (tx != null) {
    console.log("  tx hash          : " + tx.hash + "\n"
      + "   nonce           : " + tx.nonce + "\n"
      + "   blockHash       : " + tx.blockHash + "\n"
      + "   blockNumber     : " + tx.blockNumber + "\n"
      + "   transactionIndex: " + tx.transactionIndex + "\n"
      + "   from            : " + tx.from + "\n" 
      + "   to              : " + tx.to + "\n"
      + "   value           : " + tx.value + "\n"
      + "   gasPrice        : " + tx.gasPrice + "\n"
      + "   gas             : " + tx.gas + "\n"
      + "   input           : " + tx.input);
  }
}

function printBlock(block) {
  console.log("Block number     : " + block.number + "\n"
    + " hash            : " + block.hash + "\n"
    + " parentHash      : " + block.parentHash + "\n"
    + " nonce           : " + block.nonce + "\n"
    + " sha3Uncles      : " + block.sha3Uncles + "\n"
    + " logsBloom       : " + block.logsBloom + "\n"
    + " transactionsRoot: " + block.transactionsRoot + "\n"
    + " stateRoot       : " + block.stateRoot + "\n"
    + " miner           : " + block.miner + "\n"
    + " difficulty      : " + block.difficulty + "\n"
    + " totalDifficulty : " + block.totalDifficulty + "\n"
    + " extraData       : " + block.extraData + "\n"
    + " size            : " + block.size + "\n"
    + " gasLimit        : " + block.gasLimit + "\n"
    + " gasUsed         : " + block.gasUsed + "\n"
    + " timestamp       : " + block.timestamp + "\n"
    + " transactions    : " + block.transactions + "\n"
    + " uncles          : " + block.uncles);
    if (block.transactions != null) {
      console.log("--- transactions ---");
      block.transactions.forEach( function(e) {
        printTransaction(e);
      })
    }
}

function checkTransactionCount(startBlockNumber, endBlockNumber) {
  console.log("Searching for non-zero transaction counts between blocks "  + startBlockNumber + " and " + endBlockNumber);

  for (var i = startBlockNumber; i <= endBlockNumber; i++) {
    var block = eth.getBlock(i);
    if (block != null) {
      if (block.transactions != null && block.transactions.length != 0) {
        console.log("Block #" + i + " has " + block.transactions.length + " transactions")
      }
    }
  }
}

function printUncle(block, uncleNumber, uncle) {
  console.log("Block number     : " + block.number + " , uncle position: " + uncleNumber + "\n"
    + " Uncle number    : " + uncle.number + "\n"
    + " hash            : " + uncle.hash + "\n"
    + " parentHash      : " + uncle.parentHash + "\n"
    + " nonce           : " + uncle.nonce + "\n"
    + " sha3Uncles      : " + uncle.sha3Uncles + "\n"
    + " logsBloom       : " + uncle.logsBloom + "\n"
    + " transactionsRoot: " + uncle.transactionsRoot + "\n"
    + " stateRoot       : " + uncle.stateRoot + "\n"
    + " miner           : " + uncle.miner + "\n"
    + " difficulty      : " + uncle.difficulty + "\n"
    + " totalDifficulty : " + uncle.totalDifficulty + "\n"
    + " extraData       : " + uncle.extraData + "\n"
    + " size            : " + uncle.size + "\n"
    + " gasLimit        : " + uncle.gasLimit + "\n"
    + " gasUsed         : " + uncle.gasUsed + "\n"
    + " timestamp       : " + uncle.timestamp + "\n"
    + " transactions    : " + uncle.transactions + "\n");
}

function getMinedBlocks(miner, startBlockNumber, endBlockNumber) {
  if (endBlockNumber == null) {
    endBlockNumber = eth.blockNumber;
    console.log("Using endBlockNumber: " + endBlockNumber);
  }
  if (startBlockNumber == null) {
    startBlockNumber = endBlockNumber - 10000;
    console.log("Using startBlockNumber: " + startBlockNumber);
  }
  console.log("Searching for miner \"" + miner + "\" within blocks "  + startBlockNumber + " and " + endBlockNumber + "\"");

  for (var i = startBlockNumber; i <= endBlockNumber; i++) {
    if (i % 1000 == 0) {
      console.log("Searching block " + i);
    }
    var block = eth.getBlock(i);
    if (block != null) {
      if (block.miner == miner || miner == "*") {
        console.log("Found block " + block.number);
        printBlock(block);
      }
      if (block.uncles != null) {
        for (var j = 0; j < 2; j++) {
          var uncle = eth.getUncle(i, j);
          if (uncle != null) {
            if (uncle.miner == miner || miner == "*") {
              console.log("Found uncle " + block.number + " uncle " + j);
              printUncle(block, j, uncle);
            }
          }          
        }
      }
    }
  }
}


function getMyMinedBlocks(startBlockNumber, endBlockNumber) {
  getMinedBlocks(eth.accounts[0], startBlockNumber, endBlockNumber);
}


