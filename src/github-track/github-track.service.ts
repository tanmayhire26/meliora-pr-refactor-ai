import { Injectable } from '@nestjs/common';
import { CreateGithubTrackDto } from './dto/create-github-track.dto';
import { UpdateGithubTrackDto } from './dto/update-github-track.dto';
import axios from 'axios';

@Injectable()
export class GithubTrackService {
  private readonly token = process.env.GITHUB_TOKEN;
  private readonly API_KEY = process.env.GEMINI_API_KEY;
 async createBranch(owner: string, repo: string, branchName: string): Promise<void> {
  try {
  console.log("creating branch ....  started......owner, repo and branchNAame", owner,repo,branchName)
    const { data: { default_branch } } = await axios.get(`${this.baseURL}/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    console.log("REceived response from get .. .. .. . ",default_branch);

    const { data } = await axios.get(`${this.baseURL}/repos/${owner}/${repo}/git/refs/heads/${default_branch}`, {
      headers: {
        Authorization: `token ${this.token}`,
      },
    });
    console.log("after asxios call 1.2")
    await axios.post(`${this.baseURL}/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${branchName}`,
      sha: data.object.sha,
    }, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    console.log("After axios call 1.3")
  } catch (error) {
    console.log(error);
    throw error;
  }
  }

    async commitChanges(owner: string, repo: string, branchName: string, changes: Array<{ fileName: string; content: string }>): Promise<void> {
      console.log("in commit changes ....... before axios call 1")
    const { data } = await axios.get(`${this.baseURL}/repos/${owner}/${repo}/git/refs/heads/${branchName}`, {
      headers: {
        Authorization: `token ${this.token}`,
      },
    });
          console.log("in commit changes ....... after axios call 1")


    // Create a new tree with all the changes
          console.log("in commit changes ....... before axios call tree 2")

    const treeResponse = await axios.post(`${this.baseURL}/repos/${owner}/${repo}/git/trees`, {
      tree: changes.map(change => ({
        path: change.fileName,
        mode: '100644', // Regular file
        type: 'blob',
        content: change.content,
      })),
      base_tree: data.object.sha,
    }, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

              console.log("in commit changes ....... after axios call tree 2")


    // Create a new commit
              console.log("in commit changes ....... before axios call commit 3")

    const commitResponse = await axios.post(`${this.baseURL}/repos/${owner}/${repo}/git/commits`, {
      message: 'bot',
      tree: treeResponse.data.sha,
      parents: [data.object.sha],
    }, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
                  console.log("in commit changes ....... before axios call commit 3")


    // Update the branch reference to point to the new commit
    await axios.patch(`${this.baseURL}/repos/${owner}/${repo}/git/refs/heads/${branchName}`, {
      sha: commitResponse.data.sha,
    }, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
                  console.log("in commit changes ....... after  axios call branmch ref update   4")

  }

  async createPullRequest(owner: string, repo: string, title: string, body: string, headBranch: string, baseBranch: string): Promise<void> {
    console.log("inside create pull request, before axios xall .. .")
    await axios.post(`${this.baseURL}/repos/${owner}/${repo}/pulls`, {
      title,
      body,
      head: headBranch,
      base: baseBranch,
    }, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    console.log("After axios xcall .. .. . . ")
  }
}
