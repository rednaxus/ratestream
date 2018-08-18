const Web3 = require('web3');
const solc = require('solc');
const fs = require('fs');

let web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

let input = {
//	'hello.sol':'contract Hello{ string h = "hello from joad"; function g() constant returns(string){ return h; } }'
	'hello.sol': fs.readFileSync('../contracts/RatingsAgency.sol','utf8')
}
console.log('compiling',input['hello.sol']);



function findImports (path) {
	let p = path.startsWith('./') ? path.substring(2):path;
	return { contents: fs.readFileSync('../contracts/'+p,'utf8')}
	/*
	//console.log('path searching',path);
  if (path === 'Aleph.sol') {
    var res = { contents: fs.readFileSync('../contracts/Aleph.sol','utf8') }
    //res = { contents: 'library L { function f() returns (uint) { return 7; } }'};
    //console.log('got import',res);
    return res;
  }
  else if (path === 'Owned.sol')
  	return { contents: fs.readFileSync('../contracts/Owned.sol','utf8')}
  else if (path === 'erc20-api.sol')
  	return { contents: fs.readFileSync('../contracts/erc20-api.sol','utf8')}
  else
      return { error: 'File not found' }
	*/
}


var output = solc.compile({ sources: input }, 1, findImports )
for (var contractName in output.contracts)
	console.log(contractName + ' -->: ' + output.contracts[contractName].bytecode)
console.log('done compiling');

var account;
var deploy = true;

web3.eth.getCoinbase().then( (coinbase)=> { 
	account = coinbase;
	console.log('got coinbase, unlocking ',account)
	web3.eth.personal.unlockAccount(account, 'alman').
    then(() => { 
    	console.log('Account unlocked.'); 
    	const contractName = 'hello.sol:Survey';
			let Hello = new web3.eth.Contract(JSON.parse(output.contracts[contractName].interface), null, { 
    		data: '0x' + output.contracts[contractName].bytecode
			});
			console.log('compiled contract:',Hello);

			// run path 0x7bd2653e481A797676cD3ca79Ce506829C6085ba
			if (!deploy) {
				Hello.options.address = "0xa26c4d681062B50Cbb1e80A3A8ac5D26CEe53Cef"
				Hello.methods.getSurvey(0).call({ from: account }).then(console.log)
			} else {
			// deploy path
				Hello.deploy({
	    		data: '0x' + output.contracts[contractName].bytecode,
	    		arguments: []
				})
				.send({
	    		from: account,
	    		gas: 1500000,
	    		gasPrice: '30000000000000'
				}, function(error, transactionHash){ 
					console.log('got transaction hash'); 
				})
				.on('error', function(error){ 
					console.log('got error') 
				})
				.on('transactionHash', function(transactionHash){ 
					console.log('on transaction hash') 
				})
				.on('receipt', function(receipt){
	   			console.log('receipt')
	   			console.log(receipt.contractAddress) // contains the new contract address

				})
				.on('confirmation', function(confirmationNumber, receipt){ 
					//console.log('confirmation '+confirmationNumber,receipt)
				})
				.then(function(newContractInstance){
	    		console.log('new instance',newContractInstance.options.address) // instance with the new contract address
	   			newContractInstance.methods.getSurvey(0).call({ from: account }).then(console.log)
				});
			}
    })
    .catch(console.error);
} ).catch(console.error);

