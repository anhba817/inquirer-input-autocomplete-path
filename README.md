# inquirer-input-autocomplete-path

Input prompt that support auto complete file path when user press Tab

# Installation

```sh
npm install inquirer-input-autocomplete-path

yarn add inquirer-input-autocomplete-path
```

# Usage

```js
import fileInput from 'inquirer-input-autocomplete-path';

const answer = await input({
  message: "Enter your home directory",
  default: "/home/test/",
  directoryOnly: true,
});
console.log("Answer:", answer);
```
