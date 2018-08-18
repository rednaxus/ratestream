function* idMaker() {
  var index = 0;
  while(true)
    yield index++;
}

var g = idMaker()
console.log(g.next().value)
console.log(g.next().value)
console.log(g.next().value)

console.log('testing yield')

function* weirdYields() {
	var i = 0;
	while (true){
		var reset = yield i++;	
		if (reset) i = 0
	}
}

var w = weirdYields()
console.log(w.next())
console.log(w.next())
console.log(w.next())
console.log(w.next(true))
console.log(w.next())
console.log(w.next())

console.log('async tests')

const resolveAfter2Seconds = x => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(x);
    }, 2000);
  });
}


async function asyncCall() {
  console.log('in async function');
  var result = await resolveAfter2Seconds('resolved');
  console.log(result);
  // expected output: "resolved"
}

asyncCall();
console.log('after async call')



var add = async x => { // async function expression assigned to a variable
  var a = await resolveAfter2Seconds(20);
  var b = await resolveAfter2Seconds(30);
  return x + a + b;
};

add(10).then(v => {
  console.log(v);  // prints 60 after 4 seconds.
});


(async x => { // async function expression used as an IIFE
  var p_a = resolveAfter2Seconds(20);
  var p_b = resolveAfter2Seconds(30);
  return x + await p_a + await p_b;
})(10).then(v => {
  console.log(v);  // prints 60 after 2 seconds.
});

