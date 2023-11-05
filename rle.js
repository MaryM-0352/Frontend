'use strict';
/**
 * Телефонная книга
 */
const phoneBook = new Map();
const numberRex = /(^[0-9]{10}$)/
const mailRex = /почту ([\S]+)/

/**
 * Вызывайте эту функцию, если есть синтаксическая ошибка в запросе
 * @param {number} lineNumber – номер строки с ошибкой
 * @param {number} charNumber – номер символа, с которого запрос стал ошибочным
 */
function syntaxError(lineNumber, charNumber) {
    throw new Error(`SyntaxError: Unexpected token at ${lineNumber}:${charNumber}`);
}

function checkFormat(number, line) {
	let parts = line.split(' ')
	let currentLength = 2 + parts[0].length
	if (parts[0] == 'Добавь' || parts[0] == 'Удали' && parts[1] != 'контакты') {
		for (let i = 1; i < parts.length - 1; i++) {
			if (parts[i - 1] == 'телефон') {
				let search = parts[i].match(numberRex)
				if (search == null) {
					syntaxError(number, currentLength)
				}
			}
			else if (parts[i - 1] == 'почту') {
				if (parts[i + 1] != 'для' && parts[i + 1] != 'и') {
					syntaxError(number, currentLength + parts[i].length)
				}
			}
			currentLength += parts[i].length + 1
		}
	}
}

function checkCommand(number, line) {
	if (!line.includes('Создай') && !line.includes('Покажи') && !line.includes('Удали') && !line.includes('Добавь'))
                syntaxError(number, 1)
}

function checkSpace(number, line) {
	let find = ''
	let finish = line.length
	let request = ''
	if (line.includes('Удали контакты') || line.includes('Покажи')) {
		find = line.match(/есть ([^;]+)/)
		if (find != null) {
			request = find[1]
		}
	}
	if (request.length > 0) {
		finish = line.indexOf(request)
	}
	for (let i = 0; i < finish - 1; i++) {
		if (line[i] == ' ' && line[i+1] == ' ') syntaxError(number, i + 2)
	}
}

function checkSyntax(line) {
	let count = 1
	let commandStart = 0
	for (let i = 0; i < line.length; i++) {
		if (i > 0 && ['С', 'П', 'У', 'Д'].includes(line[i]) && line[i - 1] == ';') {
			commandStart = i
			count += 1
		}

		if (['С', 'П', 'У', 'Д'].includes(line[i + 1]) && line[i] != ' ' && line[i] != ';' || i == line.length - 1 && line[i] != ';') {
			syntaxError(count, i - commandStart + 2)
		}
	}
}


function checkSyntax1(number, command) {
    let comRex = /оздай|дали|обавь|окажи/gi
	if (command.match(comRex).length > 1) {
		let cIndex = command.indexOf('оздай', 5)
		let uIndex = command.indexOf('дали', 5)
		let dIndex = command.indexOf('обавь', 5)
		let pIndex = command.indexOf('окажи', 5)
		let find = Math.max(cIndex, uIndex, dIndex, pIndex)
		syntaxError(number, find)
	}
}

function checkLine(line, number) {
	checkCommand(number, line)
	checkSyntax1(number, line)
	checkSpace(number, line)
	checkFormat(number, line)
}

function createContact(name) {
    if (!(Object.keys(phoneBook).includes(name)))
        phoneBook[name] = {'телефон': [], 'почта': []}
}

function searchData(line) {
	let content = []
	if (line.includes('телефон')) {
		let number = line.match(/([0-9]{10})/)[1]
		content = ['телефон', number]
	} else if (line.includes('почту')) {
		let mail = line.match(mailRex)[1]
		content = ['почта', mail]
	}
	return content
}

function isInclude(name, pattern) {
	if (name.includes(pattern))
			return true
	for (let position in phoneBook[name]) {
		let list = phoneBook[name][position]
		for (let content of list) {
			if (content.includes(pattern)) 
				return true
		}
	}
}

function includeIn(name, pattern) {
	if (name.includes(pattern))
			return []
	let search = {'телефон': [], 'почта': []}
	for (let position in phoneBook[name]) {
		let list = phoneBook[name][position]
		for (let content of list) {
			if (content.includes(pattern))
				search[position].push(content)
		}
	}
	return search
}

function deleteContact(name) {
	if (Object.keys(phoneBook).includes(name)) {
		delete phoneBook[name]
	}	
}

function deleteData(name, key, data) {
	if (Object.keys(phoneBook).includes(name)) {
		let list = phoneBook[name][key]
		if (list.includes(data)) {
			let index = list.indexOf(data)
			list.splice(index, 1)
		}
	}
}

function deleteForRequest(request) {
	for (let user in phoneBook) {
		if (isInclude(user, request)) {
			deleteContact(user)
		}
	}
}

function addData(name, key, data) {
	if (Object.keys(phoneBook).includes(name)) {
		let list = phoneBook[name][key]
		if (!list.includes(data)) {
			list.push(data)
		}
	}
}

function showBook(request, parts) {
	let bookPart = []
	let info = ''
	for (let user in phoneBook) {
		let searchResult = includeIn(user, request)
		if (isInclude(user, request)) {
			let prev = ''
			let tels = phoneBook[user]['телефон']
			let mails = phoneBook[user]['почта']
			let dataLen = parts.length
			for (let i = 0; i < dataLen; i++) {
				if (parts[i].includes('имя')) info += user
				else if (parts[i].includes('телефоны')) {
					let normTel = ''
					if (searchResult.length === undefined) {
						normTel = searchResult['телефон'].map((str) => `+7 (${str.substring(0, 3)}) ${str.substring(3, 6)}-${str.substring(6, 8)}-${str.substring(8, 10)}`)
					} else {
						normTel = tels.map((str) => `+7 (${str.substring(0, 3)}) ${str.substring(3, 6)}-${str.substring(6, 8)}-${str.substring(8, 10)}`)
					}
					info += normTel.join(',')
				}
				else if (parts[i].includes('почты')) {
					if (searchResult.length === undefined) {
						info += searchResult['почта'].join(',')
					}
					else {
						info += mails.join(',')
					}
				}
				if (dataLen > 1 && info.length > prev.length && i != dataLen - 1) {
					info += ';'
					prev = info
				}
			}
		}
		if (info.length > 0) {
			bookPart.push(info)
			info = ''
		}
	}
	if (bookPart.length > 0) return bookPart

}

function defineCommand(line) {
	let commandType = line.match(/Создай контакт ([^;]+)/)
	if (commandType != null) {
		let name = commandType[1]
		if (name.length > 0) {
			createContact(name)
		}
		return;
	}
	else if (line.includes('Удали')) {
		commandType = line.match(/Удали контакт ([^;]+)/)
		if (commandType != null) {
			let name = commandType[1]
			if (name.length > 0) {
				deleteContact(commandType[1])
			}
			return;
		}
		commandType = line.match(/Удали .+ для контакта ([^;]+)/)
		if (commandType != null) {
			let name = commandType[1]
			if (name.length > 0) {
				for (let section of line.split(' и ')) {
					let data = searchData(section)
					deleteData(name, data[0], data[1])
				}
			}
			return;
		}
		commandType = line.match(/Удали контакты, где есть ([^;]+)/)
		if (commandType != null) {
			let request = commandType[1]
			if (request.length > 0) {
				deleteForRequest(request)
			}
			return;
		}
	}

	else if (line.includes('Добавь')) {
		commandType = line.match(/Добавь .+ для контакта ([^;]+)/)
		if (commandType != null) {
			let name = commandType[1]
			if (name.length > 0) {
				for (let section of line.split(' и ')) {
					let data = searchData(section)
					addData(commandType[1], data[0], data[1])
				}
			}
			return;
		}
	}

	else if (line.includes('Покажи')) {
		commandType = line.match(/Покажи .+ для контактов, где есть ([^;]+)/)
		if (commandType != null) {
			let request = commandType[1]
			if (request.length > 0) {
				return showBook(request, line.split(' и '))
			}
		}
	}
}

/**
 * Выполнение запроса на языке pbQL
 * @param {string} query
 * @returns {string[]} - строки с результатами запроса
 */
function run(query) {
    var result = []
	if (typeof query !== 'string' || query.length == 0) return result
	//checkSyntax(query)
	if (query.at(-1) != ';' && query.match(/;/gi).length < 1)
		syntaxError(1, query.length + 1)
    let commands = query.split(';')
    for (let i = 0; i < commands.length - 1; i++) {
		if (commands[i].length > 0) {
			checkLine(commands[i], i + 1)
        	let res = defineCommand(commands[i])
        	if (typeof res !== 'undefined') result = result.concat(res)
		}	
    }
    return result;
}

module.exports = { phoneBook, run };
