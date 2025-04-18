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

let currentDir = process.cwd()
//? Loading & Intiallizing Done

//? Functions Definations
//* 1. Run shell commands (npm installs, git, etc.)
function runShellCommand(command) {
   const spinner = ora(chalk.cyan(`Running: ${command}`)).start()

   return new Promise((resolve, reject) => {
      exec(command, { cwd: currentDir }, (error, stdout, stderr) => {
         if (error) {
            spinner.fail(chalk.red(`Failed: ${command}`))
            console.error(chalk.redBright(`❌ Error:\n${stderr}`))
            return reject(error)
         }

         spinner.succeed(chalk.bold.greenBright(`Success: ${command}`))
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
   console.log(chalk.bold.green('📄 File written:'), chalk.blue(fullPath))
}

//* 3. Read a file
function readFile(targetPath) {
   const fullPath = path.resolve(currentDir, targetPath)
   if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8')
      console.log(
         chalk.bold.green('📖 File content from:'),
         chalk.blue(fullPath)
      )
      console.log(chalk.gray(content))
      return content
   } else {
      console.warn(chalk.red('⚠️ File not found:'), chalk.cyan(fullPath))
      return null
   }
}

//* 4. Edit file (e.g., replace placeholder text, append/import, etc.)
function editFile(targetPath, content) {
   const fullPath = path.resolve(currentDir, targetPath)
   if (fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, content, 'utf8')
      console.log(chalk.bold.green('✏️ File edited:'), chalk.blue(fullPath))
   } else {
      console.warn(
         chalk.red('⚠️ Cannot edit, file not found:'),
         chalk.blue(fullPath)
      )
   }
}

//* 5. Change working directory (virtual)
function changeDirectory(newPath) {
   const targetPath = path.resolve(currentDir, newPath)
   if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isDirectory()) {
      currentDir = targetPath
      console.log(
         chalk.bold.green('📁 Changed directory to:'),
         chalk.blue(currentDir)
      )
   } else {
      fs.mkdirSync(targetPath, { recursive: true })
      currentDir = targetPath
      console.log(
         chalk.bold.green('📁 Created and changed directory to:'),
         chalk.blue(currentDir)
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
   console.log('\n')

   console.log(
      '🔧 ' + chalk.bgCyanBright.black(` Step: `),
      chalk.bold.cyan(description)
   )
   // console.log('\n')
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

//? AI Working
// const system_prompt = `
// You are an Expert React Developer and Task Executor.

// You follow 4 main phases: Analyze, Convert, Action, Output.

// ---

// ### Step 1: Analyze

// - Understand the user's goal.
// - Summarize it in one line.

// ---

// ### Step 2: Convert

// - Break down the goal into minimal, logical, and sequential PHASES.
// - Store each as a string in a \`PHASES\` array.

// ---

// ### Step 3: Action

// - Use the function \`executeTask({ type, input, content })\` to perform every task:
//   - For shell commands: \`type: "shellCommand"\`, input = shell command.
//   - For reading a file: \`type: "readFile"\`, input = file path.
//   - For writing a file: \`type: "writeFile"\`, input = file path, content = full content to write.
//   - For editing a file: \`type: "editFile"\`, input = file path, content = text to replace.
//   - For checking if file contains something: \`type: "contains"\`, input = file path, content = search string.
//   - For changing directory: \`type: "changeDirectory"\`, input = target directory.
//   - For cleanup: \`type: "cleanup"\`.
//   - For logging steps: \`type: "logStep"\`, content = step info.
//   - For suggesting fixes: \`type: "suggestImportOrFixes"\`, content = user goal or error.

// Use this output format for action steps:
// \`\`\`json
// {
//   "step": "action",
//   "function": "executeTask",
//   "fType": "shellCommand" | "readFile" | "writeFile" | "editFile" | "contains" | "changeDirectory" | "cleanup" | "logStep" | "suggestImportOrFixes",
//   "fInput": "<value passed as input>",
//   "fContent": "<optional content passed>"
// }
// \`\`\`

// ---

// ### Step 4: Output

// - Summarize what was done.
// - List all installed packages, created/modified files.

// \`\`\`json
// {
//   "step": "output",
//   "PackagesInstalled": [],
//   "content": "Summary of all work done"
// }
// \`\`\`

// ---
// REMEMBER:
// - Always use the \`executeTask\` function for every step, not just shell commands.
// - Wait for each action step to complete before continuing.
// - Return all steps in strict JSON format with only valid keys.
// - Never run two commands at once. Always wait for each to finish.
// - If a package is required, add it to \`PackagesInstalled\` array.
// - When generating output, wrap everything properly in the final JSON format.
// - Do not skip any phases — all four steps must be reflected in the final output.
// ---

// ### Output JSON Format:

// \`\`\`json
// {
//   "step": "analyze" | "convert" | "action" | "output",
//   "componentName": "ComponentName (if applicable)",
//   "PHASES": ["Step 1", "Step 2", "..."], // only for "convert"
//   "PackagesInstalled": ["package-1", "package-2"], // optional
//   "function": "runCommand" | "customFunction",
//   "input": "command to be executed",
//   "content": "summary or component content"
// }
// \`\`\`

// ---

// ### Example Flow:

// UserQuery: "Create a react app using Vite and install Tailwind CSS"

// Output:

// 1. **Analyze**

// \`\`\`json
// {
//   "step": "analyze",
//   "content": "User wants to create a React app using Vite and set up Tailwind CSS"
// }
// \`\`\`

// 2. **Convert**

// \`\`\`json
// {
//   "step": "convert",
//   "PHASES": [
//     "Create a React app using Vite",
//     "Navigate into project directory",
//     "Install dependencies",
//     "Install Tailwind CSS and required packages",
//     "Initialize Tailwind config",
//     "Add Tailwind to CSS file"
//   ]
// }
// \`\`\`

// 3. **Action**

// \`\`\`json
// { "step": "action", "function": "runCommand", "input": "npm create vite@latest my-app -- --template react" }
// { "step": "action", "function": "runCommand", "input": "cd my-app" }
// { "step": "action", "function": "runCommand", "input": "npm install" }
// { "step": "action", "function": "runCommand", "input": "npm install -D tailwindcss postcss autoprefixer" }
// { "step": "action", "function": "runCommand", "input": "npx tailwindcss init -p" }
// { "step": "action", "componentName": "tailwind.css", "content": "@tailwind base; @tailwind components; @tailwind utilities;" }
// \`\`\`

// 4. **Output**

// \`\`\`json
// {
//   "step": "output",
//   "PackagesInstalled": ["vite", "tailwindcss", "postcss", "autoprefixer"],
//   "content": "React app initialized using Vite and Tailwind CSS configured successfully"
// }
// \`\`\`

// ---
// `

const system_prompt = `
You are an Expert Developer.

Your working methodology follows 4 main steps: Analyze, Convert, Action, Output.



---

### Step 1: Analyze

- Analyze what the user is asking.
- Understand the intent — whether it's about creating a project, installing packages, making components, setting up tools, etc.
- Summarize the user intent in a simple sentence.

---

### Step 2: Convert

- Break down the user query into **step-by-step actionable instructions** relevant to a React context.
- Each step should be stored inside a \`PHASES\` array.
- Make sure steps are **minimal**, **sequential**, and **realistic** to execute.
- Installable packages should be extracted by checking the documentation if needed.
- If a component is to be created, describe it clearly.

---

### Step 3: Action

- Run the steps one-by-one **sequentially** using the \`executeTask\` function.
- Every task must include:
  - \`fType\`: One of \`shell\`, \`read\`, \`write\`, \`edit\`, \`cd\`, \`contains\`, \`clean\`, \`log\`, \`errors\`, \`suggestions\`
  - \`fInput\`: The input or command to run
  - \`fContent\` (optional): Extra content if needed (e.g., file content)

 - - Before **every step**, include a separate \`executeTask\` with:
  - \`fType: "log"\`
  - \`fInput\`: A short description of what the next step will do (e.g., "Installing Tailwind packages", "Navigating into project directory")



- Use this pattern:
  \`\`\`json
  {
    "step": "action",
    "function": "executeTask",
    "fType": "shell",
    "fInput": "npm install react",
    "fContent": ""
  }
  \`\`\`

- For file edits/creation, use \`write\` or \`edit\` and provide full content via \`fContent\`.

---

### Step 4: Output

- Return a final JSON summarizing:
  - What was done
  - Packages that were installed
  - Components that were created (if any)

---

### Output JSON Format:

\`\`\`json
{
  "step": "analyze" | "convert" | "action" | "output",
  "componentName": "ComponentName (if applicable)",
  "PHASES": ["Step 1", "Step 2", "..."], // only for "convert"
  "PackagesInstalled": ["package-1", "package-2"], // optional
  "function": "executeTask", // only used in action step
  "fType": "shell" | "read" | "write" | "edit" | ...,
  "fInput": "command or path",
  "fContent": "file content or additional input",
  "content": "summary or explanation"
}
\`\`\`

---

### Rules:

1. Always use \`executeTask\` with appropriate \`fType\`, \`fInput\`, and optional \`fContent\`.
2. Never combine multiple commands.
3. Wait for each step to complete before moving on.
4. All 4 steps must be completed in every response.
5. Output should always be valid JSON.
6. - Before Each Step, include a separate \`executeTask\` with:
  - \`fType: "log"\`
  - \`fInput\`: A short description of what the next step will do (e.g., "Analyzing the user query, "Converting the user query into a actionable steps", "Installing Tailwind Css").

---

### Example Flow:

UserQuery: "Create a react app using Vite and install Tailwind CSS"

---

1. **Analyze**

\`\`\`json
{
  "step": "analyze",
  "content": "User wants to create a React app using Vite and set up Tailwind CSS"
}
\`\`\`

2. **Convert**

\`\`\`json
{
  "step": "convert",
  "PHASES": [
    "Create a React app using Vite",
    "Navigate into project directory",
    "Install dependencies",
    "Install Tailwind CSS and required packages",
    "Initialize Tailwind config",
    "Add Tailwind to CSS file"
  ]
}
\`\`\`

3. **Action**

\`\`\`json
{ "step": "action", "function": "executeTask", "fType": "shell", "fInput": "npm create vite@latest "appropriate-project-name" -- --template react", "fContent": "" }
{ "step": "action", "function": "executeTask", "fType": "cd", "fInput": "my-app", "fContent": "" }
{ "step": "action", "function": "executeTask", "fType": "shell", "fInput": "npm install", "fContent": "" }
{ "step": "action", "function": "executeTask", "fType": "shell", "fInput": "npm install -D tailwindcss postcss autoprefixer", "fContent": "" }
{ "step": "action", "function": "executeTask", "fType": "shell", "fInput": "npx tailwindcss init -p", "fContent": "" }
{ "step": "action", "function": "executeTask", "fType": "write", "fInput": "src/index.css", "fContent": "@tailwind base;\\n@tailwind components;\\n@tailwind utilities;" }
\`\`\`

4. **Output**

\`\`\`json
{
  "step": "output",
  "PackagesInstalled": ["vite", "tailwindcss", "postcss", "autoprefixer"],
  "content": "React app initialized using Vite and Tailwind CSS configured successfully"
}
\`\`\`

---
`

const message = [{ role: 'system', content: system_prompt }]

while (true) {
   try {
      const rl = readline.createInterface({ input, output })
      const prompt = await rl.question(
         chalk.bold.bgYellowBright.black(
            '>> Enter Prompt to Generate/Edit OR Type "exit" to exit the loop : '
         )
      )
      rl.close()

      if (prompt === 'exit') {
         console.log(
            chalk.bold.bgMagentaBright.black(
               '\nThanks for using Agent Buddy! See You Later '
            ) + '✌️'
         )
         console.log('\n')
         rl.close()
         break
      }
      message.push({ role: 'user', content: prompt })
   } catch (error) {
      console.log('❌ ERROR in outer loop:', error)
   }

   while (true) {
      const response = await openai.chat.completions.create({
         model: 'gemini-2.0-flash',
         response_format: { type: 'json_object' },
         messages: message,
      })

      const parsed_result = JSON.parse(response.choices[0].message.content)

      if (parsed_result.step === 'analyze') {
         // console.log('⏩ Analyze :', parsed_result)
         message.push({
            role: 'assistant',
            content: JSON.stringify(parsed_result),
         })
      }

      if (parsed_result.step === 'convert') {
         // console.log('⏩ Convert :', parsed_result)
         message.push({
            role: 'assistant',
            content: JSON.stringify(parsed_result),
         })
      }

      if (parsed_result.step === 'output') {
         console.log('✅ Output :\n', parsed_result)
         console.log('\n')
         break
      }

      if (parsed_result.step === 'action') {
         // console.log('⚙️ Action: ', parsed_result)

         const { fType, fInput, fContent } = parsed_result

         if (fType && fInput !== undefined) {
            await executeTask({
               type: fType,
               input: fInput,
               content: fContent || '',
            })
         } else {
            console.warn('Missing fType or fInput in action step!')
         }

         message.push({
            role: 'assistant',
            content: JSON.stringify(parsed_result),
         })
      }
   }
}
