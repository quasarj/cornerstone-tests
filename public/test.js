async function main() {
	console.log("working");

	const content = document.getElementById('content');
	content.innerHTML = ""; // clear the element
	
	let eleA = document.createElement('h2');
	eleA.id = 'a';
	eleA.innerText = 'This is some text, yo';


	content.appendChild(eleA);

}


main();
