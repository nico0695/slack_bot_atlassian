import { App as SlackApp } from '@slack/bolt'
import dotenv from 'dotenv'

dotenv.config()

// Initializes your app with your bot token and signing secret
export const connectionSlackApp = new SlackApp({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.APP_TOKEN,
})

// Regex to listen slack messages
export const slackListenersKey = {
  generateConversation: /^cb?\b/i,
  cleanConversation: /^cb_clean?\b/i,
  showConversation: /^cb_show?\b/i,

  generateImages: /^img?\b/i,

  conversationFlow: /^(?!img|cb_clean|cb_show|cb\b)/i,

  // Jira commands
  jiraTest: /^\.jira\s+test\b/i,
  jiraProject: /^\.jira\s+project\b/i,
  jiraIssue: /^\.jira\s+issue\s+[A-Z]+-\d+/i,
  jiraList: /^\.jira\s+list\b/i,
  jiraSprint: /^\.jira\s+sprint\b/i,
  jiraBacklog: /^\.jira\s+backlog\b/i,
  jiraSearch: /^\.jira\s+search\b/i,

  // Bitbucket commands
  bitbucketTest: /^\.bb\s+test\b/i,
  bitbucketRepos: /^\.bb\s+repos?\b/i,
  bitbucketPRs: /^\.bb\s+prs?\b/i,
  bitbucketBranches: /^\.bb\s+branches?\b/i,
  bitbucketCommits: /^\.bb\s+commits?\b/i,
}
