import { JQLAutocomplete } from "@atlassianlabs/jql-autocomplete";
import { debug, escapeText } from './utils'
import { Jira, JiraField, JiraIssueCreateMetaProject, JiraIssueCreateMetaProjectIssueTypeField } from './jira'


export interface Field {
    id: string
    value: string
}

class FieldSelector {
    constructor(private readonly allFields: JiraField[]) { }

    private getClause(field: JiraField): string {
        const clauseNames: string[] = field.clauseNames
        if (!clauseNames || clauseNames.length === 0) {
            return field.name;
        }

        if (clauseNames.length == 1) {
            return clauseNames[0];
        }

        const candidate = clauseNames.filter(c => !c.startsWith("cf[")).sort(s => -s.length)[0];
        if (!candidate) {
            return clauseNames[0];
        }

        return candidate;
    }

    public get(ids: Set<string> | undefined = undefined): Field[] {
        const fields = ids ? this.allFields.filter(f => ids.has(f.id)) : this.allFields;
        return fields.map((f) => {
            return {
                id: f.id,
                value: this.getClause(f),
            };
        }).distinct();
    }
}

export class Suggestor {
    constructor(
        private readonly jira: Jira,
        private readonly projects: string[] | undefined = undefined
    ) { }

    private unescapeField(field: string): string {
        return field.replace(/^(["'])(.*)\1$/, '$2').replace(/\\/g, '');
    }

    private async getIssueCreateMetaProjects(): Promise<JiraIssueCreateMetaProject[]> {
        const jiraIssueCreateMeta = await this.jira.getIssueCreateMeta();
        if (!this.projects) {
            return jiraIssueCreateMeta.projects;
        }

        return jiraIssueCreateMeta.projects.filter(p => this.projects.includes(p.key))
    }

    public async getProjects() {
        return this.jira.listProjects();
    }

    public async getStatuses() {
        return (await this.jira.getStatuses()).map(s => s.name).distinct();
    }

    public async getStatusCategories() {
        return (await this.jira.getStatuses()).map(s => s.statusCategory.name).distinct();
    }

    public async getUsers() {
        return this.jira.getUsers();
    }

    public async getFields(): Promise<Field[]> {
        const fields = await this.jira.listFields()
        if (this.projects) {
            const projects = await this.getIssueCreateMetaProjects();
            const ids = new Set<string>(projects
                .filter(p => this.projects.includes(p.key))
                .flatMap(p => p.issuetypes)
                .flatMap(i => i.fields)
                .flatMap(f => Object.keys(f)))

            return new FieldSelector(fields).get(ids);
        }

        return new FieldSelector(fields).get();
    }

    private async getValuesFromFields(fields: JiraIssueCreateMetaProjectIssueTypeField[]): Promise<string[]> {
        // TODO move this logic to suggestor
        const results = [];
        let needsUsers = false;
        let needsProjects = false;
        fields.forEach(field => {
            if (field.schema.type == 'project') {
                // TODO this actually also returns allowedValues for some reason. should take advantage
                needsProjects = true;
            } else if (field.schema.type == 'user') {
                needsUsers = true;
            } else if (field.allowedValues) {
                results.push(...field.allowedValues.map(f => f.value));
            }
        })

        if (needsUsers) {
            results.push(...(await this.getUsers()));
        }

        if (needsProjects) {
            results.push(...(await this.jira.listProjects()));
        }

        return results;
    }

    private async getFieldIds(fieldId: string): Promise<Set<string>> {
        const results = new Set<string>()
        const fields = await this.jira.listFields();
        fields.forEach(field => {
            if (field.clauseNames.includes(fieldId)) {
                results.add(field.id)
            }
        })

        return results;
    }

    public async getFieldOptions(field: string): Promise<string[]> {
        const fieldIds = await this.getFieldIds(field);

        const projects = await this.getIssueCreateMetaProjects()

        const results =
            await this.getValuesFromFields(projects
                .flatMap(p => p.issuetypes)
                .flatMap(p => Object.values(p.fields).map(p => p as JiraIssueCreateMetaProjectIssueTypeField))
                .filter(f => fieldIds.has(f.name) || fieldIds.has(f.key)));

        // why do we need to special case these?
        if (field == 'status') {
            results.push(...(await this.getStatuses()))
        } else if (field == 'statusCategory') {
            results.push(...(await this.getStatusCategories()))
        }

        return results.distinct();
    }

    public async getSuggestions(tokens: string[]): Promise<string[]> {
        const text = escapeText(tokens);
        debug(`Processing text: ${text}`);
        const autocomplete = JQLAutocomplete.fromText(text);
        const position = text.length;
        const suggestions = autocomplete.getJQLSuggestionsForCaretPosition([
            position,
            position,
        ]);

        let results: string[] = [];
        if (suggestions.tokens.values) {
            results.push(...suggestions.tokens.values);
        }

        if (suggestions.rules.field) {
            results.push(...(await (await this.getFields()).map(f => f.value)));
        }

        if (suggestions.rules.operator) {
            results.push(...["=", "!=", '>', '>=', '<', '<=', 'IN(', 'NOT IN(', '~', '!~', 'IS', 'IS NOT', 'WAS', 'WAS IN', 'WAS NOT IN', 'WAS NOT', 'CHANGED'])
        }

        if (suggestions.rules.value?.context?.field) {
            const field = this.unescapeField(suggestions.rules.value.context.field);
            results.push(...(await this.getFieldOptions(field)))
        }

        debug(JSON.stringify(suggestions, null, 2));

        return results;
    }
}
