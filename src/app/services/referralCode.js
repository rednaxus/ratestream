//import { appConfig }  from '../config'
const { generate } = require('ethereumjs-wallet')

module.exports = {

  getRefCodePair: () => {
    const keyPair = generate()
    //var regKey = keyPair.getPrivateKey()
    //console.log ("Analyst ID: " + analystId)
    //console.log ("Registration Code: " + regKeyString)
    return { identity: keyPair.getAddressString(), regcode: keyPair.getPrivateKeyString() }
  }

}


