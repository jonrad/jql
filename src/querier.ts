import { Jira, JiraField, JiraIssue, JiraIssueCreateMetaProject, JiraIssueCreateMetaProjectIssueTypeField } from './jira'
import { debug } from './utils'

export interface Query {
    id: string
    jql: string
}

export interface QuerierOptions {
    maxPages: number
}

export interface QueryResults {
    total: number
    issues: JiraIssue[]
}

export class Querier {
    constructor(
        private readonly jira: Jira,
        private readonly options: QuerierOptions | undefined = undefined
    ) { }

    private async search(jql: string): Promise<QueryResults> {
        let page = 1;
        let result = await this.jira.searchJira(jql);
        let issues = result.issues;
        while (result.issues.length == result.maxResults && result.total > issues.length && page < this.options.maxPages) {
            debug(`Running search, startAt: ${issues.length}: ${jql}`)
            result = await this.jira.searchJira(jql, issues.length);
            issues.push(...result.issues)
            page++
        }

        return {
            total: result.total,
            issues: issues
        }
    }

    public async query(queries: Query[]) {
        const meta = await this.jira.getIssueCreateMeta();

        const results = {};
        const mappings = meta.projects
            .flatMap((project) =>
                project.issuetypes.flatMap((issueType) => {
                    const fields = issueType.fields;
                    return Object.keys(fields)
                        .filter((f) =>
                            f.startsWith("customfield_")
                        )
                        .map((key) => {
                            return {
                                key,
                                name: fields[key]["name"],
                            };
                        });
                })
            )
            .distinct();
        const promises = queries.map(async (query) => {
            const result = await this.search(query.jql);

            result.issues.forEach((issue) => {
                const fields = issue.fields;
                mappings.forEach(({ key, name }) => {
                    if (fields[key]) {
                        fields[name] = fields[key]["value"];
                    }
                });
            });

            results[query.id] = result;
        });

        await Promise.all(promises)
        return results
    }
}
