# jql

## Summary
Makes using JQL (Jira Query Language) a better experience from the command line

**Warning**
I made this tool for myself to simplify my life. It isn't intended to be shared, but I'm keeping it public in case someone wants to be inspired. Will it work on your computer? Maybe, but maybe not.

Features:
* Outputs Jira Issues in a format that is easier to use in templates
* Simplifies writing valid jql on the command line (bash/zsh) by enabling autocomplete and validating syntax

## Why?

Are you an engineer who who has to spend a lot of time in Jira? Do you prefer using the command line over using a UI? Wouldn't it be great if you can use all the same tools you're used to (`grep` comes to mind) when finding the Jiras that are pertinent to you? You could use this [amazing jira cli](https://github.com/ankitpokhrel/jira-cli) but then you have to memorize jql and typos are a pain, especially for us developers who are so used to code completion in our IDEs. This tool will enable jql code completion within your command line so that you can better use your tools and stay away from using clunky UIs.

Why waste time say lot word when few word do trick?

## Installing

```
npm install -g @yonrad/jql

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
jql assi<tab> = Jon<tab>
# Output:
# jql assignee = "Jon Radchenko"
```

### Example 1
```
jql --query assignedRecently assignee = Jon\ Radchenko and updatedDate \> -14d | head
```

Output:
```
{
  "assignedRecently": {
    "total": 34,
    // snip
    "issues": [
      {
        "fields": {
            // snip
            "myCustomField": "Foo"
        }
      },
      {
        // snip
      }
    ]
  }
}
```

### Example 2
```
jql --query assignedRecently 'assignee = "Jon Radchenko" and "updatedDate > -14d"'
# Output the same as above
```

### Example 3
```
jql --query assignedRecently 'assignee = "Jon Radchenko" and "updatedDate > -14d"' \
    --query anotherQuery 'assignee = "Someone Else" and "updatedDate > -14d"'
```

Output
```
{
  "assignedRecently": { ... },
  "anotherQuery": { ... }
}
```

## Using with [jira-cli](https://github.com/ankitpokhrel/jira-cli)

```
jira issue list --jql "$(jql assi<tab> = Jon<tab> AND statusC<tab> != Do<tab>)"
```
