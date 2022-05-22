#!/usr/bin/env node

const Client = require('cabal-client')
const minimist = require('minimist')

var args = minimist(process.argv.slice(2))

var usage = `Usage

  cabal-sauron --key cabal://key --owner a60bad97db13f99bc51448908a6a71de4a68aa2ede8a9db3edc6dfe4290ac9d5

  Options:
    --key
    --owner
    --nick
    --message
`

const key = (args.key || '').replace('cabal://', '').replace('cbl://', '').replace('dat://', '').replace(/\//g, '')
const owner = args.owner
const nick = args.nick || 'sauron'
var botMessage = args.message

if (!key || !owner) {
  console.log(usage)
  process.exit(1)
}

async function main() {
  var cabalClient = new Client()
  const cabalDetails = await cabalClient.addCabal(key);
  await cabalDetails.publishNick(nick, async () => {
    
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    // TODO how to better wait for the owner to load?
    console.log('Loading cabal...')
    await sleep(2000)
    console.log(`Assumed identity ${cabalDetails.getLocalUser().key}`)

    const ownerUser = cabalDetails.getUsers()[owner]
    if (!ownerUser) {
      console.log(`Could not find user ${owner}`)
      process.exit(1)
    }
    const ownerNick = ownerUser.name
    botMessage = botMessage || `🤖 I am a robot 🤖\n See https://github.com/dchiquito/cabal-sauron for my source code.\n I am operated by ${ownerNick} (${owner}), please contact them with any questions or concerns.`

    function sendPrivateMessage (message, id) {
      cabalDetails.publishMessage({
        type: 'chat/text',
        content: {
          channel: id,
          text: message
        }
      })
    }

    function keyToNick (key) {
      var user = cabalDetails.getUsers()[key]
      if (user && user.name) {
        return user.name
      } else {
        return key.substr(0, 5)
      }
    }

    console.log('registrato')
    cabalDetails.core.messages.events.on('default', function (message) {
      console.log(message)
    })
    cabalDetails.core.privateMessages.events.on('message', (pubkey, message) => {
      console.log('Received message with pubkey ', pubkey)
      if (message && message.value && message.value.content) {
        // Do not respond to our own PMs or to the owners to prevent any risk of infinite loops
        if (pubkey === cabalDetails.getLocalUser().key || pubkey === owner) {
          console.log('I skeep you')
          return
        }
        var text = message.value.content.text
        console.log('pinging the text', text)
        // Give an automated bot message to the interested stranger
        sendPrivateMessage(botMessage, pubkey, (arg)=>console.log('hm',arg))
        // Notify the owner
        sendPrivateMessage(`<${keyToNick(pubkey)}>: ${text}`, owner,(arg)=>console.log('hmmmm',arg))
        console.log('DONE!')
      }
    })

    console.log('Watching commences')
    // sendCabalMessage(startupMessage)
    sendPrivateMessage('Watching commences', owner)
  })
}

main()