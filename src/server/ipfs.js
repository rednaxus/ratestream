// Create the IPFS node instance
const node = new IPFS({ repo: '/var/ipfs/data' })

node.on('ready', () => {
  console.log('ipfs ready to go')
  node.stop(() => {
  	console.log('ipfs stopped')
  })
})
