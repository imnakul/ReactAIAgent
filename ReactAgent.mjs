import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { exec } from 'node:child_process'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs'
import path from 'path'

//? Loading & Intiallizing
dotenv.config()

const openai = new OpenAI({
   apiKey: process.env.GEMINI_API_KEY,
   baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
})

const rl = readline.createInterface({ input, output })

let currentDir = process.cwd()
//? Loading & Intiallizing Done

//? Functions Definations
function runShellCommand(command) {
   const spinner = ora(chalk.cyan(`Running: ${command}`)).start()

   return new Promise((resolve, reject) => {
      exec(command, { cwd: currentDir }, (error, stdout, stderr) => {
         if (error) {
            spinner.fail(chalk.red(`Failed: ${command}`))
            console.error(chalk.redBright(`❌ Error:\n${stderr}`))
            return reject(error)
         }

         spinner.succeed(chalk.green(`Success: ${command}`))
         console.log(chalk.gray(stdout.trim()))
         resolve(stdout)
      })
   })
}

//* 2. Write to a file (creates file and folders if needed)
function writeFile(targetPath, content) {
   const fullPath = path.resolve(currentDir, targetPath)
   fs.mkdirSync(path.dirname(fullPath), { recursive: true })
   fs.writeFileSync(fullPath, content, 'utf8')
   console.log(chalk.green('📄 File written:'), chalk.cyan(fullPath))
}

//* 3. Read a file
function readFile(targetPath) {
   const fullPath = path.resolve(currentDir, targetPath)
   if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8')
      console.log(chalk.yellow('📖 File content from:'), chalk.cyan(fullPath))
      console.log(chalk.gray(content))
      return content
   } else {
      console.warn(chalk.red('⚠️ File not found:'), chalk.cyan(fullPath))
      return null
   }
}

//* 4. Edit file (e.g., replace placeholder text, append/import, etc.)
function editFile(targetPath, callback) {
   const fullPath = path.resolve(currentDir, targetPath)
   if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8')
      const newContent = callback(content)
      fs.writeFileSync(fullPath, newContent, 'utf8')
      console.log(chalk.magenta('✏️ File edited:'), chalk.cyan(fullPath))
   } else {
      console.warn(
         chalk.red('⚠️ Cannot edit, file not found:'),
         chalk.cyan(fullPath)
      )
   }
}

//* 5. Change working directory (virtual)
function changeDirectory(newPath) {
   const targetPath = path.resolve(currentDir, newPath)
   if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isDirectory()) {
      currentDir = targetPath
      console.log(
         chalk.blue('📁 Changed directory to:'),
         chalk.cyan(currentDir)
      )
   } else {
      fs.mkdirSync(targetPath, { recursive: true })
      currentDir = targetPath
      console.log(
         chalk.blue('📁 Created and changed directory to:'),
         chalk.cyan(currentDir)
      )
   }
}

//*Some Sub functions \
//*🧹 cleanUp() – Remove unwanted files or directories (e.g., default CRA files)
function cleanUp(paths) {
   paths.forEach((p) => {
      const fullPath = path.resolve(currentDir, p)
      if (fs.existsSync(fullPath)) {
         fs.lstatSync(fullPath).isDirectory()
            ? fs.rmSync(fullPath, { recursive: true, force: true })
            : fs.unlinkSync(fullPath)
         console.log(chalk.red('🧹 Removed:'), chalk.cyan(fullPath))
      }
   })
}

//*🧪 fileContains() – Check if file has a specific string (used before appending)
function fileContains(filePath, searchText) {
   const fullPath = path.resolve(currentDir, filePath.trim())
   if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8')
      return content.includes(searchText)
   }
   return false
}

//* logStep() – For clearly describing each step an AI is performing
function logStep(description) {
   console.log(chalk.bgWhite.black(`🔧 Step:`), chalk.bold(description))
}

//*🔍 parseShellErrors() – Extract common error patterns from stderr (AI could use this for debugging)
function parseShellErrors(stderr) {
   const errors = []

   const lines = stderr.split('\n')
   lines.forEach((line) => {
      if (line.toLowerCase().includes('error') || line.includes('ERR_')) {
         errors.push(line.trim())
      }
   })

   if (errors.length) {
      console.log(chalk.bgRed.white('🛑 Detected Errors:'))
      errors.forEach((err) =>
         console.log(chalk.redBright('•'), chalk.yellow(err))
      )
   } else {
      console.log(chalk.green('✅ No critical errors found in stderr'))
   }

   return errors
}

//*🧠 suggestImportsOrFixes() – (Idea for AI): Based on error output, suggest imports or fixes
function suggestImportsOrFixes(stderr) {
   const suggestions = []

   if (stderr.includes('React is not defined')) {
      suggestions.push(
         `Did you forget to import React?\n  👉 Add: import React from 'react'`
      )
   }

   if (stderr.includes('Module not found')) {
      const match = stderr.match(/Can't resolve '(.*?)'/)
      if (match) {
         suggestions.push(
            `Missing dependency: ${match[1]}\n  👉 Try: npm install ${match[1]}`
         )
      }
   }

   if (suggestions.length) {
      console.log(chalk.bgBlue.white('💡 Suggestions:'))
      suggestions.forEach((s) => console.log(chalk.cyan('•'), chalk.green(s)))
   }

   return suggestions
}

//* 6. Decide and execute task
async function executeTask(task) {
   const { type, input, content } = task

   switch (type) {
      case 'shell':
         await runShellCommand(input)
         break
      case 'write':
         writeFile(input, content)
         break
      case 'read':
         return readFile(input)
      //  break
      case 'edit':
         editFile(input, content)
         break
      case 'cd':
         changeDirectory(input)
         break
      case 'clean':
         cleanUp(input) //input is Path
         break
      case 'contains':
         return fileContains(input, content)
      //  break
      case 'log':
         logStep(input)
         break
      case 'errors':
         parseShellErrors(input) //input -stderr
         break
      case 'suggestions':
         suggestImportsOrFixes(input)
         break
      default:
         console.error(chalk.red('❓ Unknown task type'))
   }
}

//? Functions Definations Done

// 6. Example task execution
// async function main() {
//    await executeTask({ type: 'shell', input: 'npm init -y' })

//    await executeTask({ type: 'cd', input: 'src/components' })

//    await executeTask({
//       type: 'write',
//       input: 'App.jsx',
//       content: `export default function App() { return <h1>Hello World</h1> }`,
//    })

//    await executeTask({ type: 'read', input: 'App.jsx' })

//    await executeTask({ type: 'shell', input: 'npm install react react-dom' })

//    await executeTask({
//       type: 'edit',
//       input: 'App.jsx',
//       content: (content) => {
//          return content.replace('Hello World', 'Hello World from React Agent')
//       },
//    })

//    await executeTask({ type: 'log', input: 'Trying from main function' })

//    const foundout = await executeTask({
//       type: 'contains',
//       input: ' App.jsx',
//       content: 'Hello',
//    })
//    console.log(foundout)
// }

// main()
