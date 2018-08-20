/* 
   ethplorer api
  
*/
const axios = require('axios')

const baseUrl = 'https://api.ethplorer.io/'

const config = require('../../config/appConfig')

const fetchInstance = axios.create({
  baseURL: baseUrl,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    //'Access-Control-Allow-Origin': '*',
    //'Access-Control-Allow-Credentials': 'true',
    //'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS,POST,PUT',
    //'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  	//'X-Requested-With': 'XMLHttpRequest'
  },
  params: { apiKey: config.ETHPLORER.apiKey  }
})
const fetchInstanceTops = axios.create({
  baseURL: baseUrl,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    //'Access-Control-Allow-Origin': '*',
    //'Access-Control-Allow-Credentials': 'true',
    //'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS,POST,PUT',
    //'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    //'X-Requested-With': 'XMLHttpRequest'
  },
  params: { 
    apiKey: config.ETHPLORER.apiKey,
    criteria: 'cap',
    limit: '50'
  }
})
/*
https://api.ethplorer.io/getTokenInfo/0xff71cb760666ab06aa73f34995b42dd4b85ea07b?apiKey=freekey
{
  address: "0xff71cb760666ab06aa73f34995b42dd4b85ea07b",
  name: "THBEX",
  decimals: 4,
  symbol: "THBEX",
  totalSupply: "3020000000",
  owner: "0x2cfc4e293e82d48a2c04bf89baaa98572c01c172",
  transfersCount: 1131,
  lastUpdated: 1521404220,
  totalIn: 9639680939,
  totalOut: 7619680939,
  issuancesCount: 3,
  holdersCount: 121,
  image: "https://ethplorer.io/images/everex.png",
  description: "THBEX is the cryptocash digital asset representing one unit of the Thailand national currency. Thai Baht (THB) with the pegged exchange rate of 1:1. THBEX is underwritten by licensed financial institutions in Thailand and is guaranteed 100% by physical currency reserves, surety bonds, or the underwriters' own capital. Financial guarantee and proof of funds documentation is available in specific issuance records. For more information, visit https://Everex.io",
  price: false,
  countOps: 1134
}

{
  address: "0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0",
  name: "EOS",
  decimals: 18,
  symbol: "EOS",
  totalSupply: "1000000000000000000000000000",
  owner: "0xd0a6e6c54dbc68db5db3a091b171a77407ff7ccf",
  transfersCount: 1908343,
  lastUpdated: 1521567897,
  totalIn: 2.5964967036019e+27,
  totalOut: 2.5964967036019e+27,
  issuancesCount: 0,
  holdersCount: 296830,
  description: "https://eos.io/",
  price: {
    rate: "6.20306",
    diff: 13.82,
    diff7d: 6.07,
    ts: "1521567252",
    marketCapUsd: "4593573472.0",
    availableSupply: "740533458.0",
    volume24h: "702290000.0",
    currency: "USD"
  },
  countOps: 1908343
}
*/
module.exports = {
  getTopTokens: () => fetchInstanceTops.request({
    method:'get',
    url:'getTopTokens'
  }),
  getTokenInfoExt: tokenAddr => {
    return fetchInstance.request({
        method:'get',
        url:'getTokenInfo/'+tokenAddr
    })
  }
}
  


