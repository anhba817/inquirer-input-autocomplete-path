import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  isEnterKey,
  isBackspaceKey,
  type PromptConfig,
} from "@inquirer/core";
import type {} from "@inquirer/type";
import chalk from "chalk";
import fs from "fs";

type InputConfig = PromptConfig<{
  default?: string;
  directoryOnly?: boolean;
  transformer?: (value: string, { isFinal }: { isFinal: boolean }) => string;
  validate?: (value: string) => boolean | string | Promise<string | boolean>;
}>;

export default createPrompt<string, InputConfig>((config, done) => {
  const { validate = () => true } = config;
  const [status, setStatus] = useState<string>("pending");
  const [defaultValue = "", setDefaultValue] = useState<string | undefined>(
    config.default
  );
  const [errorMsg, setError] = useState<string | undefined>(undefined);
  const [suggestion, setSuggestion] = useState<string | undefined>(undefined);
  const [value, setValue] = useState<string>("");

  const isLoading = status === "loading";
  const prefix = usePrefix(isLoading);

  useKeypress(async (key, rl) => {
    // Ignore keypress while our prompt is doing other processing.
    if (status !== "pending") {
      return;
    }

    if (isEnterKey(key)) {
      const answer = value || defaultValue;
      setStatus("loading");
      const isValid = await validate(answer);
      if (isValid === true) {
        setValue(answer);
        setStatus("done");
        done(answer);
      } else {
        // Reset the readline line value to the previous value. On line event, the value
        // get cleared, forcing the user to re-enter the value instead of fixing it.
        rl.write(value);
        setError(isValid || "You must provide a valid value");
        setStatus("pending");
      }
    } else if (isBackspaceKey(key) && !value) {
      setDefaultValue(undefined);
    } else if (key.name === "tab") {
      if (!value) {
        setDefaultValue(undefined);
        rl.clearLine(0); // Remove the tab character.
        rl.write(defaultValue);
        setValue(defaultValue);
      } else {
        rl.clearLine(0); // Remove the tab character.
        let files: string[];
        let dirents: fs.Dirent[];
        const currentDirArr = value.split("/");
        currentDirArr.pop();
        let currentDir = currentDirArr.join("/");
        if (!currentDir) currentDir = ".";
        try {
          dirents = fs.readdirSync(currentDir, {
            withFileTypes: true,
          });
        } catch (err) {
          dirents = [];
        }
        if (config.directoryOnly) {
          files = dirents
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
        } else {
          files = dirents.map((dirent) => dirent.name);
        }
        const currentLevelText = value.split("/").pop() || "";
        const matches = files.filter((file) =>
          file.startsWith(currentLevelText)
        );
        if (matches.length > 1) {
          setSuggestion(matches.join("\n"));
          rl.write(value);
          setError(undefined);
        } else if (matches.length === 1) {
          rl.write(`${currentDir}/${matches[0]}`);
          setValue(`${currentDir}/${matches[0]}`);
          setError(undefined);
        }
      }
    } else {
      setValue(rl.line);
      setError(undefined);
    }
  });

  const message = chalk.bold(config.message);
  let formattedValue = value;
  if (typeof config.transformer === "function") {
    formattedValue = config.transformer(value, { isFinal: status === "done" });
  }
  if (status === "done") {
    formattedValue = chalk.cyan(formattedValue);
  }

  let defaultStr = "";
  if (defaultValue && status !== "done" && !value) {
    defaultStr = chalk.dim(` (${defaultValue})`);
  }

  let error = "";
  if (errorMsg) {
    error = chalk.red(`> ${errorMsg}`);
  }
  let suggestText = "";
  if (suggestion) suggestText = suggestion;

  return [
    `${prefix} ${message}${defaultStr} ${formattedValue}`,
    [suggestText, error].filter(Boolean).join("\n"),
  ];
});
