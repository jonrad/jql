import JiraApi from "jira-client";
import * as yargs from 'yargs';
import cachedir from 'cachedir';
import { Suggestor } from "./suggestor";
import { Jira } from "./jira";
import { enableConsoleDebug, Thunk, escapeText, enableFileDebug, debug } from "./utils";
import { completionZshTemplate, completionShTemplate } from "./templates"
import * as path from 'path'
import * as os from 'os';
import { promises as fs } from 'fs'
import prompts from 'prompts'
import nconf from 'nconf';
import { CacheWrapper } from "./cache-wrapper";
import columnify from 'columnify'
import { Query, Querier } from './querier'

export class Program {
    protected readonly cacheDir: string = "jql";

    protected thunk: Thunk;

    protected cachingJira: Jira | (Jira & CacheWrapper)

    protected args: any; //todo strongly typed

    private createJira(caching: boolean = true): Jira | (Jira & CacheWrapper) {
        const host = nconf.get('jira-host');
        const username = nconf.get('jira-username')
        const password = nconf.get('jira-password')

        if (!host) {
            throw Error('Jira host not provided. Run config')
        }
        if (!username) {
            throw Error('Jira username not provided. Run config')
        }
        if (!password) {
            throw Error('Jira password not provided. Run config')
        }

        const jiraApi = new JiraApi({
            host: host,
            strictSSL: true,
            protocol: "https",
            apiVersion: "3",
            username: username,
            password: password
        });

        const jira = new Jira(jiraApi);
        if (caching) {
            return CacheWrapper.create(jira, this.thunk)
        } else {
            return jira;
        }
    }

    private getJira(): Jira | (Jira & CacheWrapper) {
        if (!this.cachingJira) {
            this.cachingJira = this.createJira();
        }

        return this.cachingJira;
    }

    private async getResults<T>(
        func: (suggestor: Suggestor) => Promise<T[]>
    ): Promise<T[]> {
        const cachingJira = this.getJira();

        const suggestor = new Suggestor(cachingJira, this.args.prj as string[] | undefined); // todo strongly typed

        return await func(suggestor);
    }

    private async printResults(
        func: (suggestor: Suggestor) => Promise<string[]>,
        sort: boolean = true
    ): Promise<void> {
        let results = await this.getResults(func);
        if (sort) {
            results = results.sort()
        }
        console.log(results.join("\n"));
    }

    public async showCompletions(argv: string[]): Promise<void> {
        const index = argv.lastIndexOf('--query')
        if (index > -1) {
            argv = argv.slice(index + 2)
        }
        this.printResults((suggestor) => suggestor.getSuggestions(argv));
    }

    public async showFields(projects: string[] | undefined = undefined): Promise<void> {
        let results = await this.getResults(async (suggestor) => await suggestor.getFields());
        console.log(columnify(results))
    }

    public async showProjects(): Promise<void> {
        this.printResults(async (suggestor) => await suggestor.getProjects());
    }

    public async showStatuses(): Promise<void> {
        this.printResults(async suggestor => (await suggestor.getStatuses()))
    }

    public async showStatusCategories(): Promise<void> {
        this.printResults(async suggestor => (await suggestor.getStatusCategories()))
    }

    public async showUsers(): Promise<void> {
        this.printResults(async (suggestor) => await suggestor.getUsers());
    }

    private async findCacheDir() {
        const cacheDir = cachedir(this.cacheDir)
        await fs.mkdir(cacheDir, {
            recursive: true
        })

        return (dir) => dir ? path.join(cacheDir, dir) : cacheDir
    }

    public async main() {
        const tryThunk = await this.findCacheDir()

        if (!tryThunk) {
            throw Error("Could not get cache dir")
        }

        this.thunk = tryThunk;

        nconf
            .env({
                lowerCase: true,
                transform: (x) => {
                    x.key = x.key.replace(/_/g, '-')
                    return x;
                }
            })
            .file({
                file: path.join(os.homedir(), ".jql.conf.json"),
            })

        await yargs
            .parserConfiguration({
                "unknown-options-as-args": true
            })
            .middleware((args) => {
                // gross
                this.args = args;

                if (args.debug) {
                    enableConsoleDebug();
                }
                if (args.fileDebug) {
                    enableFileDebug();
                }
            })
            .command({
                command: 'show',
                describe: 'Show available values',
                builder: (yargs) => {
                    yargs.command({
                        command: "fields",
                        describe: 'fields',
                        handler: async (args) => {
                            this.showFields(args.prj as string[] | undefined); // todo strongly type
                        },
                    })
                    .command({
                        command: "users",
                        describe: 'users',
                        handler: async () => {
                            this.showUsers();
                        },
                    })
                    .command({
                        command: "projects",
                        describe: 'projects',
                        handler: async () => {
                            this.showProjects();
                        },
                    })
                    .command({
                        command: ["statuses", "status"],
                        describe: 'statuses',
                        handler: async () => {
                            this.showStatuses();
                        },
                    })
                    .command({
                        command: ["status-category", "statusCategory", "status-categories", "statusCategories"],
                        describe: 'status categories',
                        handler: async () => {
                            this.showStatusCategories();
                        },
                    })

                    return yargs;
                },
                handler: () => {
                    yargs.showHelp()
                }
            })
            .command({
                command: "completion",
                describe: "show completion script",
                handler: () => {
                    const zshShell =
                        (process.env["SHELL"]?.includes("zsh") ||
                            process.env["ZSH_NAME"]?.includes("zsh")) ??
                        false;
                    let script = zshShell
                        ? completionZshTemplate
                        : completionShTemplate;
                    const name = "jql";

                    script = script.replace(/{{app_name}}/g, name);
                    script = script.replace(
                        /{{completion_command}}/g,
                        "completion"
                    );
                    console.log(
                        script.replace(/{{app_path}}/g, process.argv[1])
                    );
                },
            })
            .command({
                command: "cache",
                describe: "Cache related commands",
                builder: (yargs) => {
                    return yargs.command({
                        command: ["reset", "clear"],
                        describe: "reset cache",
                        handler: () => {
                            // TODO better handling
                            (this.getJira() as CacheWrapper)?.resetCache();
                        },
                    });
                },
                handler: () => {
                    console.log(`Cache dir: ${this.thunk()}`);
                }, // TODO
            })
            .command({
                command: 'config',
                describe: 'Configure jira details',
                handler: async (yargs) => {
                    const results = await prompts([
                        {
                            name: "jira-host",
                            type: 'text',
                            message: 'Jira host',
                            initial: nconf.get('jira-host') || '',
                            validate: value => {
                                // TODO
                                return true;
                            }
                        },
                        {
                            name: "jira-username",
                            type: 'text',
                            message: 'Jira username',
                            initial: nconf.get('jira-username') || ''
                        },
                        {
                            name: "jira-password",
                            type: 'password',
                            message: 'Jira password',
                        }
                    ])

                    Object.keys(results).forEach(key => {
                        if (results[key]) {
                            nconf.set(key, results[key])
                        }
                    })

                    await new Promise((resolve) => nconf.save(resolve))
                    console.log(`Successfully saved config`);
                }
            })
            .command({
                command: "*",
                handler: async (argv) => {
                    if (argv.getCompletions) {
                        this.showCompletions(argv._.map((a) => a.toString()))
                    } else if (argv._.length == 0) {
                        yargs.showHelp();
                    } else {
                        const positionalArgs = argv._.map(p => p.toString());

                        const queries = Array<Query>()
                        if (positionalArgs[0] != "--query") {
                            queries.push({
                                id: 'result',
                                jql: escapeText(positionalArgs)
                            })
                        } else {
                            let query = [];
                            positionalArgs.shift()
                            let id = positionalArgs.shift();
                            while (positionalArgs.length) {
                                const arg = positionalArgs.shift();
                                if (arg != "--query") {
                                    query.push(arg)
                                } else {
                                    queries.push({
                                        id: id,
                                        jql: escapeText(query)
                                    })
                                    id = positionalArgs.shift();
                                    query = [];
                                }
                            }
                            queries.push({
                                id: id,
                                jql: escapeText(query),
                            });
                        }

                        const jira = this.getJira();
                        const querier = new Querier(jira, {
                            maxPages: 5 //TODO
                        })

                        const results = await querier.query(queries);
                        console.log(JSON.stringify(results, null, 2))
                    }
                },
            })
            .option("prj", {
                alias: ["p"],
                description: "jira project to filter by",
                array: false,
                string: true,
                coerce: (items) => {
                    if (!items) {
                        return undefined;
                    }

                    if (items.split) { //string
                        items = [ items ]
                    }

                    return items
                        .flatMap(item => item.split(','))
                        .map(item => item.trim())
                        .filter(item => item != '')
                        .distinct()
                }
            })
            .option("debug", {
                hidden: true,
                boolean: true,
            })
            .option("file-debug", {
                hidden: true,
                boolean: true,
            })
            .option("max-pages", {
                number: true,
                default: 10
            })
            .option("get-completions", { boolean: true, hidden: true, alias: ['get-completion', 'getCompletion', 'getCompletions'] })
            .parse();
    }
}
