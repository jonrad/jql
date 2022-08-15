# jql

## Summary
Simplifies writing valid jql on the command line (bash/zsh) by enabling autocomplete and validating syntax

## Why?

Are you an engineer who who has to spend a lot of time in Jira? Do you prefer using the command line over using a UI? Wouldn't it be great if you can use all the same tools you're used to (`grep` comes to mind) when finding the Jiras that are pertinent to you? You could use this [amazing jira cli](https://github.com/ankitpokhrel/jira-cli) but then you have to memorize jql and typos are a pain, especially for us developers who are so used to code completion in our IDEs. This tool will enable jql code completion within your command line so that you can better use your tools and stay away from using clunky UIs.

Why waste time say lot word when few word do trick?
## Installing

```
npm install -g @jonrad/jql

# Add the following to your bashrc or zshrc (or run from command line to test as a one off)
source <(jql completion)
```

## Getting started

```
jql config # then follow prompts
```

## How to use

```
# The following will give you valid syntax to provide to anything that requires jql
jql assi<tab> = Jon<tab><enter>
# Output:
# assignee = "Jon Radchenko"
```

## Using with [jira-cli](https://github.com/ankitpokhrel/jira-cli)

```
jira issue list --jql "$(jql assi<tab> = Jon<tab> AND statusC<tab> != Do<tab>)"
```
