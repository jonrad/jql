export const completionShTemplate = `###-begin-{{app_name}}-completions-###
#
# jql command completion script
#
# Installation: {{app_path}} {{completion_command}} >> ~/.bashrc
#    or {{app_path}} {{completion_command}} >> ~/.bash_profile on OSX.
#
_{{app_name}}_completions()
{
    local cur_word args type_list

    cur_word="\${COMP_WORDS[COMP_CWORD]}"
    shift COMP_WORDS
    args=("\${COMP_WORDS[@]}")

    # ask to generate completions.
    type_list=$({{app_path}} --get-completions "\${args[@]}")

    COMPREPLY=( $(compgen -W "\${type_list}" -- \${cur_word}) )

    # if no match was found, fall back to filename completion
    if [ \${#COMPREPLY[@]} -eq 0 ]; then
      COMPREPLY=()
    fi

    return 0
}
complete -o bashdefault -o default -F _{{app_name}}_completions {{app_name}}
###-end-{{app_name}}-completions-###
`;

export const completionZshTemplate = `#compdef {{app_name}}
###-begin-{{app_name}}-completions-###
#
# jql command completion script
#
# Installation: {{app_path}} {{completion_command}} >> ~/.zshrc
#    or {{app_path}} {{completion_command}} >> ~/.zprofile on OSX.
#
_{{app_name}}_completions()
{
  local reply
  local si=$IFS

  shift words
  text="$words"
  # Attempt to find if there's unescaped quotes (TODO move this further down)
  ERROR=$(eval "echo $text" 2>&1 >/dev/null)
  if [[ "$ERROR" == *unmatched* ]]
  then
    QUOTE=\${ERROR: -1}
    if [[ "$text" == $QUOTE* ]]
    then
        text=\${text:1}
    fi
  fi
  evalText="{{app_path}} --file-debug --get-completions $text"
  if [[ "$text" == *" " ]]
  then
      evalText="$evalText ''"
  fi

  IFS=$'\n' reply=($(COMP_CWORD="$((CURRENT-1))" COMP_LINE="$BUFFER" COMP_POINT="$CURSOR" eval $evalText))
  IFS=$si
  _describe 'values' reply
}
compdef _{{app_name}}_completions {{app_name}}
###-end-{{app_name}}-completions-###
`;
