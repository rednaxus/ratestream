
function* entries(obj) { // object iterator
	for (let key of Object.keys(obj)) 
		yield [key, obj[key]]
}

module.exports = {

	tokenMarket: ( market ) => {
		/*
		{
			"timestamp":1534704803,
			"address":"0xf230b790e05390fc8295f4d3f60332c93bed42e2",
			"name":"Tronix",
			"decimals":"6",
			"symbol":"TRX",
			"totalSupply":"100000000000000000",
			"owner":"0x",
			"transfersCount":2812176,
			"lastUpdated":1534704049,
			"issuancesCount":0,
			"holdersCount":1086597,
			"ethTransfersCount":13,
			"price":{
				"rate":"0.0217371068",
				"diff":3.32,
				"diff7d":-4.38,
				"ts":"1534703280",
				"marketCapUsd":"1429173727.0",
				"availableSupply":"65748111645.0",
				"volume24h":"96649929.5064",
				"diff30d":-40.690993326167,
				"currency":"USD"
			},
			"countOps":2812176
		}
		*/
		var str = ''
		for ( let [key, value] of entries(market) ) {
   		if (key === 'price') {
   			for ( let [pkey, pvalue] of entries(value) ){
   				switch (pkey) {
   					case 'ts': 
   						str += ''
   						break
   					default: 
   						str += `<i>${pkey}</i> <b>${pvalue}</b>\n`
   				}
   			}
   		} else {
				switch (key) {
					case 'address': 
						str += `<i>${key}</i> <a href="https://etherscan.io/address/${value}">${value}</a>\n`
   					break
   				default:
   					str += `<i>${key}</i> <b>${value}</b>\n`
   				}
   			}
			}
		//console.log(str)
		return str
	}

}