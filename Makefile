default: build

serve: node_modules
	npm run start

build: node_modules
	npm run build

node_modules: package.json
	npm i
