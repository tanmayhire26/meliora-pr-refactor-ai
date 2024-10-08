import { Injectable } from '@nestjs/common';
import { CreateGithubTrackDto } from './dto/create-github-track.dto';
import { UpdateGithubTrackDto } from './dto/update-github-track.dto';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { UserPrScoreRepository } from 'src/user-pr-score/user-pr-score.repository';

@Injectable()
export class GithubTrackService {
  constructor(
      private readonly userPrScoreRepo: UserPrScoreRepository

  ){

  }
  private readonly token = process.env.GITHUB_BOT_TOKEN;
  private readonly ownerToken = process.env.GITHUB_OWNER_TOKEN;
  private readonly API_KEY = process.env.GEMINI_API_KEY;
  private readonly baseURL = 'https://api.github.com';
  private readonly owner = "tanmayhire26";
  private readonly repo = "cashflo";
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
      message: 'refactored code by bot',
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

  async handleReviewCommentAdded (reviewCommentAddedPayload) {
    try {

      const { pull_request: { number: pullRequestNumber, head: {ref} }, repository: { full_name: repo }, comment: { body, diff_hunk, path } } = reviewCommentAddedPayload;
      console.log("branch name = ", ref);
      console.log("filename or path wher changes are expected = ", path);
      console.log("comment body = ", body);
      console.log("Comment on lines ie diff_hunk = ", diff_hunk);
      //get the file content from the path
      const fileContent = await this.getFileContent(path);
      //prompt with the file content thediff_hunk and the comment body to gemini to get the refactored code
      const prompt = `I want you to refactor a code of a file whose code content is ${fileContent} 
       according to the comment added to a PR on github which is ${body} 
       and the diff_hunk which is ${diff_hunk} will indicates which part of the code needs to be changed 
        and refactor code ony for that part of the file in response keeping other code in the file intact unless necessary and no other explantory text. Please provide the refactored code without any Markdown formatting or additional comments. I also dont want the three backticks followed by typescript in the beginning and the again the three back ticks at the end of the generated response`;
      const refactoredCode = await this.getRefactoredCodeFromGeminiPrompt(prompt);
      console.log("refactored_code = ", refactoredCode);
      //commit the refactored code to the branch
      await this.commitChanges(this.owner, this.repo, ref, [ { fileName: path, content: refactoredCode } ]);
      console.log("Pr comment changes commited");
      return;
    } catch (error) {
      throw error;
    }
  }

   async getFileContent(path) {
    try {
      console.log("token of github in get file content file -== ==  ", this.token);
       const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3.raw',
      },
    });
    console.log("Axios call that gets file content successful, file content = ", response.data);
    return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getRefactoredCodeFromGeminiPrompt (prompt) {
    try {
      const genAI = new GoogleGenerativeAI(this.API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"})
      const result = await model.generateContent(prompt);
      return await this.cleanRefactorPromptReponse(result.response.text());
    } catch (error){
      throw error;
    }
  }

  async cleanRefactorPromptReponse(cleanedCode) {
    try {
       

    // Remove Markdown code block delimiters
   cleanedCode = cleanedCode.replace(/```typescript\n/, '').replace(/```/, '').trim();

    return cleanedCode; // Return the cleaned code
    } catch (error) {
      throw error;
    }
  }

   async getLatestCommit(repoFullName: string, prNumber: number,) {
    try {
        // Fetch commits for the pull request
        console.log("getting latest commit the url =  ",`https://api.github.com/repos/${this.owner}/${repoFullName}/pulls/${prNumber}/commits`);
    const response = await axios.get(`https://api.github.com/repos/${this.owner}/${repoFullName}/pulls/${prNumber}/commits`, {
      headers: {
        // Authorization: `token ${this.ownerToken}`, // Replace with your token
        Authorization: `token ${this.ownerToken}`, // Replace with your token
        Accept: 'application/vnd.github.v3+json',
      },
    });
    console.log("response of latet commit = ", response);

    // Return the latest commit (first in array)
    return response.data[0]; // The first commit is the latest one
    } catch  (error)  {
      console.log(error);
      throw error;
    }
  
  }

  async savePRAnalysisScores ({userName, fileContents, prNumber}) {
    try {
      let combinedScore = {
        readability:0,
        maintainability:0,
        performance:0,
        proneness_to_error:0,
        test_coverage:0,
        modularity:0,
        scalability:0,
        complexity:0,
        adherence_to_solid_principles:0,
        documentation_quality:0,
        total_score: 0,
      }
      
      for(let fc of fileContents) {
        let {qualityAnalysis} = fc;
        let qualityAnalysisObj = JSON.parse(qualityAnalysis);
        for(let key in JSON.parse(qualityAnalysis)) {
          console.log("quality Score for the key = ", key," is ",qualityAnalysisObj[key]," with type = ", typeof qualityAnalysisObj[key]);
          combinedScore[key] += Number(qualityAnalysisObj[key]);
        }
        console.log("combined score for every iteration = ", combinedScore);
      }
      for (let key in combinedScore) {
        combinedScore[key] = Math.floor(Number(combinedScore[key]) / fileContents.length);
      }
      console.log({userName, score: combinedScore, prNumber});
      const savedUserPrScore = await this.userPrScoreRepo.create({userName, score: combinedScore, prNumber});
      console.log("savedUserPrScore = ", savedUserPrScore);
      return savedUserPrScore;

      
    } catch (error) {
      console.log(error);
      throw error;
    }
  }


  async createPrComment(body) {
    try {
      const {action, pull_request} = body;
      const repoOwner = pull_request.base.repo.owner.login;
      const repoName = pull_request.base.repo.name;
      const prNumber = pull_request.number;

      //get file lists that were changed in the PR

      const filesChanged = await this.getChangedFiles(repoOwner, repoName, prNumber);

    } catch (error) {
      console.log(error.message);
      throw error;
    }
  }

  async getChangedFiles(owner: string, repo: string, prNumber: number) {
  const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`, {
    headers: {
      Authorization: `token ${this.token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  return response.data; // Contains an array of changed files
}

async getFileContents(owner: string, repo: string, path: string,) {
  const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: {
      Authorization: `token ${this.token}`,
      Accept: 'application/vnd.github.v3.raw',
    },
  });
  return Buffer.from(response.data.content, 'base64').toString(); // Decode Base64 content
}

async createTestCasesForPR(filenames, pullNumber) {
  try {
    let testCasesFilesContent = [];
    for(let fname of filenames) {
      console.log("filename = ", fname);
      if(fname.includes('.ts') && !fname.includes('.spec.ts')) {
        let fileContent = await this.getFileContent(fname);
        let prompt = `Generate a jest test cases file for the following file contents of a nestJs project ${fileContent}. Only give the code in the response without any other comments or unwanted text. the response should be without any Markdown formatting or additional comments. I also dont want the three backticks followed by typescript in the beginning and the again the three back ticks at the end of the generated response`;
        let testCasesCodeResponse = await this.getRefactoredCodeFromGeminiPrompt(prompt);
        testCasesFilesContent.push({fileName: fname.replace(/\.ts$/, '.spec.ts'), content: testCasesCodeResponse});
      } 
     
    }
    // Create a new branch
    let branchName = "bot-test-cases-" + pullNumber + Date.now();
    await this.createBranch(this.owner, this.repo, branchName);
    
     // Commit changes
    await this.commitChanges(this.owner, this.repo, branchName, testCasesFilesContent);

     // Create pull request
    await this.createPullRequest(this.owner, this.repo, 'bot-testcases', 'This PR includes refactored files.', branchName, "master");
    console.log("PR with test cases created successfully");
  } catch (error) {
    console.log(error);
    throw error
  }
}
}
