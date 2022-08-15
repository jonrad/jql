import JiraApi, { FieldObject, JsonResponse } from "jira-client"
import { Thunk, debug } from './utils'
import { promises as fs } from 'fs'

// Status
export interface StatusCategory {
    name: string
}

export interface Status {
    name: string
    statusCategory: StatusCategory
}

// Field
export interface JiraField {
    id: string
    name: string
    clauseNames: string[]
}

export interface JiraIssueCreateMetaProjectIssueTypeFieldAllowedValue {
    id: string
    value: string
}

export interface JiraIssueCreateMetaProjectIssueTypeFieldSchema {
    type: string
}

export interface JiraIssueCreateMetaProjectIssueTypeField {
    name: string
    key: string
    allowedValues: JiraIssueCreateMetaProjectIssueTypeFieldAllowedValue[]
    schema: JiraIssueCreateMetaProjectIssueTypeFieldSchema
}

export interface JiraIssueCreateMetaProjectIssueType {
    name: string
    fields: JiraApi.JsonResponse
}

export interface JiraIssueCreateMetaProject {
    key: string
    issuetypes: JiraIssueCreateMetaProjectIssueType[]
}

export interface JiraIssueCreateMeta {
    projects: JiraIssueCreateMetaProject[]
}

export interface JiraIssue {
    expand: string
    id: string
    self: string
    key: string
    fields: JsonResponse
}

export interface JiraIssueSearchPage {
    startAt: number
    maxResults: number
    total: number
    issues: JiraIssue[];
}

export class Jira {
    constructor(
        private readonly jira: JiraApi
    ) { }

    public async listFields(): Promise<JiraField[]> {
        return (await this.jira.listFields()).map(f => f as JiraField)
    }

    public async getStatuses(): Promise<Status[]> {
        return (await this.jira.listStatus()).map(s => s as Status)
    }

    public async getUsers(): Promise<string[]> {
        // TODO pagination
        return (await this.jira.getUsers(0, 10000)).map(s => s.displayName)
    }

    public async listProjects(): Promise<string[]> {
        return (await this.jira.listProjects()).map(s => s.key)
    }

    public async getIssueCreateMeta(): Promise<JiraIssueCreateMeta> {
        return (await this.jira.getIssueCreateMetadata({
            expand: "projects.issuetypes.fields"
        })) as JiraIssueCreateMeta
    }

    public async searchJira(jql: string, startAt: number = 0): Promise<JiraIssueSearchPage> {
        return (await this.jira.searchJira(jql, {
            startAt
        })) as JiraIssueSearchPage
    }
}
