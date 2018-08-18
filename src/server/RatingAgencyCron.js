const Web3 = require('web3');
const solc = require('solc');
const fs = require('fs');

const debug = require('debug')
const cronlog = debug('cron')
const eventlog = debug('event')

// Contract descriptions from truffle
const RatingAgencyObj = require("../build/contracts/RatingAgency.json");
const AnalystRegistryObj = require("../build/contracts/AnalystRegistry.json");

var config = {
	ANALYST_REGISTRY:"0x889082ed72e0b7afd16b395d51b316b9b607bcc1",
	gas:4500000,
	gasPrice: '30000000000000'
}

const Cron = require('cron').CronJob;
console.log('started at ',new Date())
let web3 = new Web3('ws://localhost:8546');
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));
//console.log("Talking with a geth server", Web3);

const runInterval = 86400 	// e.g. 4 days
let runTime = 1514764800 
var account;
var deploy = false;

setTimeout(()=> { // needed because of a bug in web3 1.0

	
	//console.log('web3',web3.eth.personal);
	web3.eth.getCoinbase().then( coinbase => { 

		account = coinbase;
		console.log('got coinbase, unlocking ',account)
		let transactObj = { from: account, gas: config.gas, gasPrice: config.gasPrice}

		//web3.eth.personal.unlockAccount(account, 'alman').then(() => { 
	  //	console.log('Account unlocked.'); 
	  	//const contractName = 'RatingAgency.sol:RatingAgency';
	  	//var iface = JSON.parse(output.contracts[contractName].interface)
	  	//console.log('inteface:',iface)

			let ratingAgencyAddress = RatingAgencyObj.networks[7].address //"0x58A9f90944cd2fd2fBAa0B8ed6c27631F442B60f"
			console.log('rating agency address',ratingAgencyAddress)

			let RatingAgency = new web3.eth.Contract(RatingAgencyObj.abi,ratingAgencyAddress,transactObj);
			const events = () => {
				let evtRange = { fromBlock: 0, toBlock: 'latest' }

				RatingAgency.events.TokenAdd(evtRange, (error, event) => {
		  		eventlog(error?error:'', JSON.stringify(event));
				})
				RatingAgency.events.CycleAdded(evtRange, (error, event) => {
		  		eventlog(error?error:'', event);
				})
				/*
				RatingAgency.events.AvailabilityAdd(evtRange, (error, event) => {
		  		eventlog(error?error:'', JSON.stringify(event));
				})
				*/
				RatingAgency.events.RoundPopulated(evtRange, (error, event) => {
		  		eventlog(error?error:'', JSON.stringify(event));
				})
				RatingAgency.events.RoundActivated(evtRange, (error, event) => {
		  		eventlog(error?error:'', JSON.stringify(event));
				})
				RatingAgency.events.RoundScheduled(evtRange, (error, event) => {
		  		eventlog(error?error:'', JSON.stringify(event));
				})
				RatingAgency.events.RoundFinished(evtRange, (error, event) => {
		  		console.log(error?error:'', JSON.stringify(event));
				})

				RatingAgency.events.Cron(evtRange, (error, event) => {
		  		eventlog(error?error:'', JSON.stringify(event));
		  		console.log('return value', event.returnValues);
					// don't do here, not dependable runTime = event.returnValues._timestamp + runInterval	// adjust next interval to last time ran
				})
			}
			//events()

			const doRun = () => {
				cronlog('at time:',runTime)
				RatingAgency.methods.generateAllAvailabilities().send(transactObj)
				.on('transactionHash', cronlog)
				.on('receipt', receipt => {
  				//cronlog('got receipt')
				})
				.on('confirmation', (confirmationNumber, receipt) => {
					//cronlog('got confirmation',confirmationNumber, receipt)
				})
				.on('error', console.error)
				.then( result => {
					cronlog('generated availabilities',result)
					RatingAgency.methods.cron(runTime).send(transactObj).then( result => {
						cronlog('cron run finished',result)
						runTime += runInterval
					})
  			})
			}

			const readline = require('readline');
			const rl = readline.createInterface(process.stdin, process.stdout);
			rl.setPrompt(runTime+':[deploy,run,cron] > ');
			rl.prompt();
			rl.on('line', function(line) {
	  		if (line === "exit") rl.close();
	  		else if (line === "deploy") {
					cronlog('deploying not enabled...')
					/*
					RatingAgencyContract.deploy({
		    		data: RatingAgencyObj.bytecode,
		    		arguments: []
					})
					.send({
		    		from: account,
		    		gas: 3500000,
		    		gasPrice: '30000000000000'
					}, function(error, transactionHash){ 
						cronlog('got transaction hash'); 
					})
					.on('error', function(error){ 
						cronlog('got error') 
					})
					.on('transactionHash', function(transactionHash){ 
						cronlog('on transaction hash') 
					})
					.on('receipt', function(receipt){
		   			cronlog('receipt')
		   			cronlog(receipt.contractAddress) // contains the new contract address

					})
					.on('confirmation', function(confirmationNumber, receipt){ 
						//cronlog('confirmation '+confirmationNumber,receipt)
					})
					.then(function(newContractInstance){
						contractAddress = newContractInstance.options.address // change default running address to this
		    		cronlog('new instance',contractAddress) // instance with the new contract address
		   			newContractInstance.methods.cron(0).call({ 
		   				from: account, 
		    			gas: 3500000,
		    			gasPrice: '30000000000000'
		   			}).then(cronlog)
					});
					*/
	  		}
	  		else if ( line.startsWith("r") ) {
	  			doRun()
	  		}
	  		else if (line === "cron") {
					const cronjob = new Cron('*/1 * * * *', doRun, null, true, 'America/Los_Angeles')
	  		}
	  		rl.prompt();
			}).on('close',function(){
	  		process.exit(0);
			});

	  //})
	  //.catch( error => {
	  //	console.log(error, 'error unlocking personal')
	  //})
	})
	.catch( error => {	
			console.log(error,'error getting coinbase')
	})

},1000) 	
