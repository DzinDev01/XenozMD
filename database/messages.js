require('./settings')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const chalk = require('chalk')
const FileType = require('file-type')
const PhoneNumber = require('awesome-phonenumber') 

const { imageToWebp, videoToWebp, writeExif } = require('./exif');
const { isUrl, getGroupAdmins, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep, getTypeUrlMedia } = require('./function');
const { jidNormalizedUser, proto, getBinaryNodeChildren, getBinaryNodeChild, generateWAMessageContent, generateForwardMessageContent, prepareWAMessageMedia, delay, areJidsSameUser, extractMessageContent, generateMessageID, downloadContentFromMessage, generateWAMessageFromContent, jidDecode, generateWAMessage, toBuffer, getContentType, getDevice } = require('@whiskeysockets/baileys') 

async function MessagesUpsert(dzin, message, store) {
	try {
		let botNumber = await dzin.decodeJid(dzin.user.id);
		const msg = message.messages[0];
		const type = msg.message ? (getContentType(msg.message) || Object.keys(msg.message)[0]) : ''
		if (!msg.message) return
		if (!dzin.public && !msg.key.fromMe && message.type === 'notify') return
		const m = await Serialize(dzin, msg, store)
		if (m.isBaileys) return
		require('../dzin.js')(dzin, m, message, store);
		if (type === 'interactiveResponseMessage' && m.quoted && m.quoted.fromMe) {
			let apb = await generateWAMessage(m.chat, { text: JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id, mentions: m.mentionedJid }, {
				userJid: dzin.user.id,
				quoted: m.quoted
			});
			apb.key = msg.key
			apb.key.fromMe = areJidsSameUser(m.sender, dzin.user.id);
			if (m.isGroup) apb.participant = m.sender;
			let pbr = {
				...msg,
				messages: [proto.WebMessageInfo.fromObject(apb)],
				type: 'append'
			}
			dzin.ev.emit('messages.upsert', pbr);
		}
	} catch (e) {
		throw e;
	}
}

async function Solving(dzin, store) {
	dzin.public = true
	
	dzin.serializeM = (m) => MessagesUpsert(dzin, m, store)
	
	dzin.decodeJid = (jid) => {
	  if (!jid) return jid 
	  if (/:\d+@/gi.test(jid)) {
	    let decode = jidDecode(jid) || {} 
	    return decode.user && decode.server && decode.user + '@' + decode.server || jid
	  } else return jid
	}
	
	dzin.getName = (jid, withoutContact  = false) => {
		const id = dzin.decodeJid(jid);
		if (id.endsWith('@g.us')) {
			const groupInfo = store.contacts[id] || dzin.groupMetadata(id) || {};
			return Promise.resolve(groupInfo.name || groupInfo.subject || PhoneNumber('+' + id.replace('@g.us', '')).getNumber('international'));
		} else {
			if (id === '0@s.whatsapp.net') {
				return 'WhatsApp';
			}
		const contactInfo = store.contacts[id] || {};
		return withoutContact ? '' : contactInfo.name || contactInfo.subject || contactInfo.verifiedName || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international');
		}
	} 
	
	dzin.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
		async function getFileUrl(res, mime) {
			if (mime && mime.includes('gif')) {
				return dzin.sendMessage(jid, { video: res.data, caption: caption, gifPlayback: true, ...options }, { quoted });
			} else if (mime && mime === 'application/pdf') {
				return dzin.sendMessage(jid, { document: res.data, mimetype: 'application/pdf', caption: caption, ...options }, { quoted });
			} else if (mime && mime.includes('webp') && !/.jpg|.jpeg|.png/.test(url)) {
				return dzin.sendAsSticker(jid, res.data, quoted, options);
			} else if (mime && mime.includes('image')) {
				return dzin.sendMessage(jid, { image: res.data, caption: caption, ...options }, { quoted });
			} else if (mime && mime.includes('video')) {
				return dzin.sendMessage(jid, { video: res.data, caption: caption, mimetype: 'video/mp4', ...options }, { quoted });
			} else if (mime && mime.includes('audio')) {
				return dzin.sendMessage(jid, { audio: res.data, mimetype: 'audio/mpeg', ...options }, { quoted });
			}
		}
		const axioss = axios.create({
			httpsAgent: new https.Agent({ rejectUnauthorized: false }),
		});
		const res = await axioss.get(url, { responseType: 'arraybuffer' });
		let mime = res.headers['content-type'];
		if (!mime || mime.includes('octet-stream')) {
			const fileType = await FileType.fromBuffer(res.data);
			mime = fileType ? fileType.mime : null;
		}
		const hasil = await getFileUrl(res, mime);
		return hasil
	} 
	
	dzin.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
		const buffer = await dzin.downloadMediaMessage(message);
		const type = await FileType.fromBuffer(buffer);
		const trueFileName = attachExtension ? `./sampah/${filename ? filename : Date.now()}.${type.ext}` : filename;
		await fs.promises.writeFile(trueFileName, buffer);
		return trueFileName;
	}
	
	dzin.getFile = async (PATH, save) => {
		let res;
		let filename;
		let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
		let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' }
		filename = path.join(__dirname, './sampah/' + new Date * 1 + '.' + type.ext)
		if (data && save) fs.promises.writeFile(filename, data)
		return {
			res,
			filename,
			size: await getSizeMedia(data),
			...type,
			data
		}
	} 
	
	dzin.sendMedia = async (jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
		const { mime, data, filename } = await dzin.getFile(path, true);
		const isWebpSticker = options.asSticker || /webp/.test(mime);
		let type = 'document', mimetype = mime, pathFile = filename;
		if (isWebpSticker) {
			pathFile = await writeExif(data, {
				packname: options.packname || global.packname,
				author: options.author || global.author,
				categories: options.categories || [],
			})
			await fs.unlinkSync(filename);
			type = 'sticker';
			mimetype = 'image/webp';
		} else if (/image|video|audio/.test(mime)) {
			type = mime.split('/')[0];
			mimetype = type == 'video' ? 'video/mp4' : type == 'audio' ? 'audio/mpeg' : mime
		}
		let anu = await dzin.sendMessage(jid, { [type]: { url: pathFile }, caption, mimetype, fileName, ...options }, { quoted, ...options });
		await fs.unlinkSync(pathFile);
		return anu;
	}
	return dzin
}

async function Serialize(dzin, m, store) {
	const botNumber = dzin.decodeJid(dzin.user.id)
	if (!m) return m
	if (m.key) {
		m.id = m.key.id
		m.chat = m.key.remoteJid
		m.fromMe = m.key.fromMe
		m.isBot = ['HSK', 'BAE', 'B1E', '3EB0', 'B24E', 'WA'].some(a => m.id.startsWith(a) && [12, 16, 20, 22, 40].includes(m.id.length)) || false
		m.isGroup = m.chat.endsWith('@g.us')
		m.sender = dzin.decodeJid(m.fromMe && dzin.user.id || m.participant || m.key.participant || m.chat || '')
		if (m.isGroup) {
			m.metadata = store.groupMetadata[m.chat] ? store.groupMetadata[m.chat] : (store.groupMetadata[m.chat] = await dzin.groupMetadata(m.chat));
			m.admins = (m.metadata.participants.reduce((a, b) => (b.admin ? a.push({ id: b.id, admin: b.admin }) : [...a]) && a, []))
			m.isAdmin = m.admins.some((b) => b.id === m.sender)
			m.participant = m.key.participant
			m.isBotAdmin = !!m.admins.find((member) => member.id === botNumber)
		}
	}
	if (m.message) {
		m.type = getContentType(m.message) || Object.keys(m.message)[0]
		m.msg = (/viewOnceMessage/i.test(m.type) ? m.message[m.type].message[getContentType(m.message[m.type].message)] : (extractMessageContent(m.message[m.type]) || m.message[m.type]))
		m.body = m.message?.conversation || m.msg?.text || m.msg?.conversation || m.msg?.caption || m.msg?.selectedButtonId || m.msg?.singleSelectReply?.selectedRowId || m.msg?.selectedId || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || m.msg?.name || ''
		m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
		m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || '';
		m.prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(m.body) ? m.body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0] : /[\uD800-\uDBFF][\uDC00-\uDFFF]/gi.test(m.body) ? m.body.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gi)[0] : ''
		m.command = m.body && m.body.replace(m.prefix, '').trim().split(/ +/).shift()
		m.args = m.body?.trim().replace(new RegExp("^" + m.prefix?.replace(/[.*=+:\-?^${}()|[\]\\]|\s/g, '\\$&'), 'i'), '').replace(m.command, '').split(/ +/).filter(a => a) || []
		m.device = getDevice(m.id)
		m.expiration = m.msg?.contextInfo?.expiration || 0
		m.timestamp = (typeof m.messageTimestamp === "number" ? m.messageTimestamp : m.messageTimestamp.low ? m.messageTimestamp.low : m.messageTimestamp.high) || m.msg.timestampMs * 1000
		m.isMedia = !!m.msg?.mimetype || !!m.msg?.thumbnailDirectPath
		if (m.isMedia) {
			m.mime = m.msg?.mimetype
			m.size = m.msg?.fileLength
			m.height = m.msg?.height || ''
			m.width = m.msg?.width || ''
			if (/webp/i.test(m.mime)) {
				m.isAnimated = m.msg?.isAnimated
			}
		}
		m.quoted = m.msg?.contextInfo?.quotedMessage || null
		if (m.quoted) {
			m.quoted.message = extractMessageContent(m.msg?.contextInfo?.quotedMessage)
			m.quoted.type = getContentType(m.quoted.message) || Object.keys(m.quoted.message)[0]
			m.quoted.id = m.msg.contextInfo.stanzaId
			m.quoted.device = getDevice(m.quoted.id)
			m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
			m.quoted.isBot = m.quoted.id ? ['HSK', 'BAE', 'B1E', '3EB0', 'B24E', 'WA'].some(a => m.quoted.id.startsWith(a) && [12, 16, 20, 22, 40].includes(m.quoted.id.length)) : false
			m.quoted.sender = dzin.decodeJid(m.msg.contextInfo.participant)
			m.quoted.fromMe = m.quoted.sender === dzin.decodeJid(dzin.user.id)
			m.quoted.text = m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
			m.quoted.msg = extractMessageContent(m.quoted.message[m.quoted.type]) || m.quoted.message[m.quoted.type]
			m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
			m.quoted.body = m.quoted.msg?.text || m.quoted.msg?.caption || m.quoted?.message?.conversation || m.quoted.msg?.selectedButtonId || m.quoted.msg?.singleSelectReply?.selectedRowId || m.quoted.msg?.selectedId || m.quoted.msg?.contentText || m.quoted.msg?.selectedDisplayText || m.quoted.msg?.title || m.quoted?.msg?.name || ''
			m.getQuotedObj = async () => {
				if (!m.quoted.id) return false
				let q = await store.loadMessage(m.chat, m.quoted.id, dzin)
				return await Serialize(dzin, q, store)
			}
			m.quoted.key = {
				remoteJid: m.msg?.contextInfo?.remoteJid || m.chat,
				participant: m.quoted.sender,
				fromMe: areJidsSameUser(dzin.decodeJid(m.msg?.contextInfo?.participant), dzin.decodeJid(dzin?.user?.id)),
				id: m.msg?.contextInfo?.stanzaId
			}
			m.quoted.isGroup = m.quoted.chat.endsWith('@g.us')
			m.quoted.mentions = m.quoted.msg?.contextInfo?.mentionedJid || []
			m.quoted.body = m.quoted.msg?.text || m.quoted.msg?.caption || m.quoted?.message?.conversation || m.quoted.msg?.selectedButtonId || m.quoted.msg?.singleSelectReply?.selectedRowId || m.quoted.msg?.selectedId || m.quoted.msg?.contentText || m.quoted.msg?.selectedDisplayText || m.quoted.msg?.title || m.quoted?.msg?.name || ''
			m.quoted.prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(m.quoted.body) ? m.quoted.body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0] : /[\uD800-\uDBFF][\uDC00-\uDFFF]/gi.test(m.quoted.body) ? m.quoted.body.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gi)[0] : ''
			m.quoted.command = m.quoted.body && m.quoted.body.replace(m.quoted.prefix, '').trim().split(/ +/).shift()
			m.quoted.isMedia = !!m.quoted.msg?.mimetype || !!m.quoted.msg?.thumbnailDirectPath
			if (m.quoted.isMedia) {
				m.quoted.mime = m.quoted.msg?.mimetype
				m.quoted.size = m.quoted.msg?.fileLength
				m.quoted.height = m.quoted.msg?.height || ''
				m.quoted.width = m.quoted.msg?.width || ''
				if (/webp/i.test(m.quoted.mime)) {
					m.quoted.isAnimated = m?.quoted?.msg?.isAnimated || false
				}
			}
			m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
				key: {
					remoteJid: m.quoted.chat,
					fromMe: m.quoted.fromMe,
					id: m.quoted.id
				},
				message: m.quoted,
				...(m.isGroup ? { participant: m.quoted.sender } : {})
			})
			m.quoted.download = () => dzin.downloadMediaMessage(m.quoted)
			m.quoted.delete = () => {
				dzin.sendMessage(m.quoted.chat, {
					delete: {
						remoteJid: m.quoted.chat,
						fromMe: m.isBotAdmins ? false : true,
						id: m.quoted.id,
						participant: m.quoted.sender
					}
				})
			}
		}
	}
	
	m.download = () => dzin.downloadMediaMessage(m)
	
	m.copy = () => Serialize(dzin, proto.WebMessageInfo.fromObject(proto.WebMessageInfo.toObject(m)))
	
	m.reply = async (text, options = {}) => {
		const chatId = options?.chat ? options.chat : m.chat
		const caption = options.caption || '';
		const quoted = options?.quoted ? options.quoted : m
		try {
			if (/^https?:\/\//.test(text)) {
				const data = await axios.get(text, { responseType: 'arraybuffer' });
				const mime = data.headers['content-type'] || (await FileType.fromBuffer(data.data)).mime
				if (/gif|image|video|audio|pdf|stream/i.test(mime)) {
					return dzin.sendMedia(chatId, data.data, '', caption, quoted, options)
				} else {
					return dzin.sendMessage(chatId, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })
				}
			} else {
				return dzin.sendMessage(chatId, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })
			}
		} catch (e) {
			return dzin.sendMessage(chatId, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })
		}
	}

	return m
}

module.exports = { MessagesUpsert, Solving }

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})