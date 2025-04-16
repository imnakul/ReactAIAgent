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

// 2. Write to a file (creates file and folders if needed)
function writeFile(targetPath, content) {
   const fullPath = path.resolve(currentDir, targetPath)
   fs.mkdirSync(path.dirname(fullPath), { recursive: true })
   fs.writeFileSync(fullPath, content, 'utf8')
   console.log(chalk.green('📄 File written:'), chalk.cyan(fullPath))
}

// 3. Read a file
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

// 4. Change working directory (virtual)
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

// 5. Decide and execute task
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
         break
      case 'cd':
         changeDirectory(input)
         break
      default:
         console.error(chalk.red('❓ Unknown task type'))
   }
}
//? Functions Definations Done
