const utils = require('../src/app/services/utils')

let names = ['Alice', 'Bob', 'Tiff', 'Bruce', 'Alice']

let countedNames = names.reduce( (allNames, name) => { 
  if (name in allNames) {
    allNames[name]++
  }
  else {
    allNames[name] = 1
  }
  return allNames
}, {})

console.log(countedNames)
// countedNames i

let friends = [{
  name: 'Anna',
  books: ['Bible', 'Harry Potter'],
  age: 21
}, {
  name: 'Bob',
  books: ['War and peace', 'Romeo and Juliet'],
  age: 26
}, {
  name: 'Alice',
  books: ['The Lord of the Rings', 'The Shining'],
  age: 18
}]

// allbooks - list which will contain all friends' books +  
// additional list contained in initialValue
let allbooks = friends.reduce(function(accumulator, currentValue) {
	console.log('accum',accumulator,'curr',currentValue)
  return [...accumulator, ...currentValue.books];
}, ['Alphabet']);

console.log('all books',allbooks)



/**
 * Runs promises from array of functions that can return promises
 * in chained manner
 *
 * @param {array} pfn_arr - promise (function) array
 * @return {Object} promise object
 */
const runPromisesInSequence = (pfn_arr, input) =>  
	pfn_arr.reduce(
    (promiseChain, currentFunction) => promiseChain.then(currentFunction),
    Promise.resolve(input)
  )


// promise function 1
function p1(a) {
  return new Promise((resolve, reject) => {
    resolve(a * 5)
  })
}

// promise function 2
function p2(a) {
  return new Promise((resolve, reject) => {
    resolve(a * 2)
  })
}

// function 3  - will be wrapped in a resolved promise by .then()
function f3(a) {
 return a * 3
}

// promise function 4
function p4(a) {
  return new Promise((resolve, reject) => {
    resolve(a * 4)
  })
}

//const repeatEach = (n,f) => new Array(n).fill().forEach( (_,i)=> f(i) )
new Array(10).fill().forEach( (_,i) => 
	utils.runPromisesInSequence([p1, p2, f3, p4], i).then(console.log)   // 1200
)

