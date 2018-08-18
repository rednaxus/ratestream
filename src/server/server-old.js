
//const solc = require('solc');
const fs = require('fs')
const util = require('util')
const debug = require('debug')

//const cronlog = debug('cron')
const eventlog = debug('event')

var express = require('express')
var app = express()
var bodyParser = require('body-parser')

var parseRange = require('parse-numeric-range').parse;
const config = require('../src/app/config/appConfig')
const roundsService = require('../src/app/services/API/rounds')


const { getRatingAgency, getAnalystRegistry } = require('../src/app/services/contracts')

console.log('config',config)

const SurveyService = require('../src/app/services/survey')
const survey = new SurveyService()
//console.log('survey',survey)
console.log(survey.getElements())


var port = process.env.PORT || 9030;        

var apiRouter = express.Router()
var ctlRouter = express.Router()

// Contract descriptions from truffle
const RatingAgencyObj = require("../build/contracts/RatingAgency.json")
const AnalystRegistryObj = require("../build/contracts/AnalystRegistry.json")

app.use(bodyParser.urlencoded({ extended: true })); // configure app to use bodyParser()
app.use(bodyParser.json());                         // this will let us get the data from a POST

//const Web3 = require('web3')
let web3 =  require('../src/app/services/web3') // require('./web3') //new Web3(config.ETHEREUM.ws)
//web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));
console.log("Talking with a geth server",web3.version)

//setTimeout( () => { // needed because of a bug in web3 1.0
let account
let ra
let ar
let tr

let testAnalysts = new Array(14).fill().map( ( item,idx ) =>  {
  let id = (idx<10?'0':'') + idx
  return ({
    id:idx,
    email:`veva${id}@veva.one`
  })
})
console.log( 'test analysts',testAnalysts )

const sendError = err => {
  console.log( 'send error', err )
}
const callError = err => {
  console.log( 'call error', err )
}
const apiError = err  => {
  console.log( 'api error', err )
}

//console.log('web3',web3.eth.personal);
web3.eth.getCoinbase( ( err, coinbase ) => { // setup on launch

  account = coinbase
  console.log('got coinbase ',account)
  tr = { from: account, gas: config.ETHEREUM.gas, gasPrice: config.ETHEREUM.gasPrice }

  //web3.eth.personal.unlockAccount(account, 'alman').then(() => { 
  //  console.log('Account unlocked.'); 
    //const contractName = 'RatingAgency.sol:RatingAgency';
    //var iface = JSON.parse(output.contracts[contractName].interface)
    //console.log('inteface:',iface)

  let ratingAgencyAddress = RatingAgencyObj.networks[config.ETHEREUM.network].address //"0x58A9f90944cd2fd2fBAa0B8ed6c27631F442B60f"
  let analystRegistryAddress = AnalystRegistryObj.networks[config.ETHEREUM.network].address

  console.log('rating agency address',ratingAgencyAddress)
  console.log('analyst registry address',analystRegistryAddress)

  let RatingAgency = new web3.eth.Contract( RatingAgencyObj.abi, ratingAgencyAddress, tr )
  let AnalystRegistry = new web3.eth.Contract( AnalystRegistryObj.abi, analystRegistryAddress, tr )
  ra = RatingAgency.methods
  ar = AnalystRegistry.methods

})//.catch( error => console.log(error,'error getting coinbase') )


/*
Running migration: 2_deploy_contracts.js
  Deploying AnalystRegistry...
  ... 0xb5f25cb1603fadc0ea7d62082b14f3f423c3e79a4be1848985a7364cfd2cd065
  AnalystRegistry: 0x5fcc303fc970394afadff52a1c5224ad0a677c4d
  Deploying RatingAgency...
  ... 0x26d0b7cb9710e789311eb8418b7a84edff0d031e436a6f668d1828a292988d62
  RatingAgency: 0x594274b7619fd1b9ce9b83b771bcf6ec4a4efa95
  Deploying test2...
  ... 0x3a4b1f06e517b4f74c03a9a41b56b0e037e4d2c4dc0eed0381538a22b32167c6
  test2: 0x3ae851d5780725853de7118c73d0bd2a303c7fff
  Deploying vevaTest...
  ... 0x0c8301e0865d5b1d0f545678f65a75c4d408880f0fe5b208523a96a73529093e
  vevaTest: 0xaa9bceb2d84ded2147e971de3c579ffee2a677ce
Saving successful migration to network...
  ... 0x9402eec7e1e809e1c36aee75272ac018c098cb9c90bddb3b4615783592a89c6f
Saving artifacts...
*/


var getAccountBalance = (account,cb) => {
  console.log('getting eth balance');
  web3.eth.getBalance(account,(err,result)=> {
    console.log('got eth balance:',web3.fromWei(result,'ether'));
    if (cb) cb(val);
  });
}

var getBlock = () => { // delete me
  var block = 2000000;
  var getEthBlock = Promise.promisify(web3.eth.getBlock);
  getEthBlock(block).then((result)=> {
    console.log('got block '+block+':',result);
  });
}


var getBlocks = (blockrange) => {
  return new Promise((resolve,reject)=>{
    var rangeArr = parseRange(blockrange);
    var getBlock;
    var blocks = [];
    var blockResults = [];
    if (!rangeArr.length) {
      console.log('no blocks requested');
      reject('no blocks requested');
    }
    getBlock = Promise.promisify(web3.eth.getBlock);

    rangeArr.forEach((blocknum)=> {
      blocks.push(getBlock(blocknum).then((result)=>{
        blockResults.push(result);
      }));
    });
    
    Promise.all(blocks).then(()=> {
      blockResults.sort((b1,b2)=> { return(b1.number - b2.number) } );
      //console.log('got blocks',rangeArr);
      //console.log('block results',blockResults)
      resolve(blockResults);
    });

  });

}


apiRouter.get('/', ( req, res ) => {
    res.json({ message: 'hooray! welcome to api!' });   
})

apiRouter.get('/round/:round/:analyst', ( req, res ) => {
  roundsService.getRoundInfo( req.params.round, req.params.analyst ).then( roundInfo => {

    console.log('round info',roundInfo)
    res.json( roundInfo )
  }).catch( apiError )
})

var ctlRouter = express.Router();              // get an instance of the express Router
ctlRouter.get('/', function(req, res) {
  res.json({ message: 'hooray! welcome to ctl!' });   
})

ctlRouter.route('/rounds').get( ( req, res ) => {
  ra.lasttime().call( tr ).then( result => {
    res.json({lasttime: result})    
    console.log( result )
  }).catch( callError )
})

ctlRouter.route( '/cycleGenerateAvailabilities/:cycleId' ).get( ( req, res ) => {
  ra.cycleGenerateAvailabilities(req.params.cycleId).send( tr ).then( result => {
    //let str = util.inspect( result, { depth:6 } ) 
    //console.log( str )
    res.json( result )
  }).catch( sendError )
})

ctlRouter.route( '/roundActivate/:cycle/:token' ).get( ( req, res ) => {
  ra.roundActivate( req.params.cycle, req.params.token ).send( tr ).then( result => {
    //let str = util.inspect( result, { depth:6 } ) 
    //console.log( str )
    res.json( result )
  }).catch( sendError )
})

ctlRouter.route( '/testWholeRound/:cycle/:token' ).get( ( req, res) => {
  // Volunteer test users to the cycle

  // Confirm test users

  // Activate a round

  // Submit first surveys for the jurists

  // Submit dummy briefs by the leads

  // Submit second surveys for the jurists

  // Finish the round

  // Get the round tallies


})

ctlRouter.route( '/testNextCycle/:cycle' ).get( ( req, res ) => {
  // get the current time/cycle

  // Volunteer users to next cycle

  // Confirm users for cycle, one group for each token

  // Move cron to start of next cycle

    // Call roundCanActivate (should return next token id) -- do until false
  
    // Activate round for next token

  
  // Move cron halfway to first survey due

  // for each round:
    // Generate first surveys for all jurists and submit them

    // Submit dummy lead briefs

    // Move cron to brief/survey due time

    // Generate second surveys for all jurists and submit them

  // 


})

/*
curl -X POST --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x7E5BCE8eE498F6C29e4DdAd10CB816D6E2f139f7", "latest"],"id":1}' http://localhost:8545
*/
apiRouter.route('/eth').get(function(req,res){
    console.log('got get');
}).post(function(req,res) {
  console.log('got post, making proxy request',req.body);
  ethProxy.web(req, res, { target: 'http://localhost:8545' }, function(e) { 
    console.log('got proxy response',e);
    res.json({message:"got it"});
  })
})



app.use('/api', apiRouter)

app.use('/ctl', ctlRouter)

app.listen(port, function () {
  console.log('listening on port '+port);
})




