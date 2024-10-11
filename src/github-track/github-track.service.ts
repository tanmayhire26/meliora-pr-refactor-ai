import { Injectable } from '@nestjs/common';
import { CreateGithubTrackDto } from './dto/create-github-track.dto';
import { UpdateGithubTrackDto } from './dto/update-github-track.dto';
import axios from 'axios';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
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

  async handleReviewCommentAdded (reviewCommentAddedPayload, branchName) {
    try {

      const { pull_request: { number: pullRequestNumber, head: {ref} }, repository: { full_name: repo }, comment: { body, diff_hunk, path } } = reviewCommentAddedPayload;
      console.log("branch name = ", ref);
      console.log("filename or path wher changes are expected = ", path);
      console.log("comment body = ", body);
      console.log("Comment on lines ie diff_hunk = ", diff_hunk);
      //get the file content from the path
      const fileContent = await this.getFileContent(path, branchName);
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

   async getFileContent(path, branchName) {
    try {
      console.log("token of github in get file content file -== ==  ", this.token);
       const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}?ref=${branchName}`;
       console.log("url in getFileContent .. .. .. .", url)
    const response = await axios.get(url, {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3.raw',
      },
    });
    console.log("Axios call that gets file content successful, file content = ", response.data);
    return response.data;
    } catch (error) {
      console.log(error);
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

async createTestCasesForPR(filenames, pullNumber, currentBranchName) {
  try {
    let testCasesFilesContent = [];
    for(let fname of filenames) {
      console.log("filename = ", fname);
      if(fname.includes('.ts') && !fname.includes('.spec.ts')) {
        let fileContent = await this.getFileContent(fname, currentBranchName);
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

async doCodingAbilityAnalysis({filesChanged, prNumber, userName, branchName}) {
  try {
    //fileContents should have the following structure: [{fileName: "...ts", content: "....code", }]
    console.log("FilesChanged .. . .. . . . . . ", JSON.stringify(filesChanged, null, 4))
     const fileContents = await Promise.all(filesChanged.map(async (file) => {
        const content = await this.getFileContent(file.filename, branchName);
        return { fileName: file?.filename, content };
    }));
    console.log("File contents ...in doCodingAbilityAnalsysis function", fileContents)
    const schema = {
       "type": SchemaType.OBJECT,
        "description":"judging the coding ability of a developer",
        "properties": {
          "strengths":{
            "type": SchemaType.ARRAY,
            "description": "strengths of the developers coding ability",
            "items":{
              "type": SchemaType.OBJECT,
              "properties": {
                "parameter": {
                  "type": SchemaType.STRING,
                  "description": "strengths related parameter of the developers coding ability",
                   nullable: false
                },
                "description": {
                  "type": SchemaType.STRING,
                  "description": "strengths related description of the developers coding ability related to the parameter",
                   nullable: false
                },
                // "score": {
                //   "type": SchemaType.NUMBER,
                //   "description": "strengths related score of the developers coding ability under the parameter",
                //    nullable: false,
                //    minimum: 0,
                //    maximum: 100
                // }
              }
            }
            
          },
           "weaknesses":{
            "type": SchemaType.ARRAY,
            "description": "weaknesses of the developers coding ability",
            "items":{
              "type": SchemaType.OBJECT,
              "properties": {
                "parameter": {
                  "type": SchemaType.STRING,
                  "description": "weaknesses related parameter of the developers coding ability",
                   nullable: false
                },
                "description": {
                  "type": SchemaType.STRING,
                  "description": "weaknesses related description of the developers coding ability related to the parameter",
                   nullable: false
                },
                // "score": {
                //   "type": SchemaType.NUMBER,
                //   "description": "weaknesses related score of the developers coding ability under the parameter",
                //    nullable: false,
                //    minimum: 0,
                //    maximum: 100
                   
                // }
              }
            }
            
          },
           "threats":{
            "type": SchemaType.ARRAY,
            "description": "threats of the developers coding ability",
            "items":{
              "type": SchemaType.OBJECT,
              "properties": {
                "parameter": {
                  "type": SchemaType.STRING,
                  "description": "threats related parameter of the developers coding ability",
                   nullable: false
                },
                "description": {
                  "type": SchemaType.STRING,
                  "description": "threats related description of the developers coding ability related to the parameter",
                   nullable: false
                },
                // "score": {
                //   "type": SchemaType.NUMBER,
                //   "description": "threats related score of the developers coding ability under the parameter",
                //    nullable: false,
                //    minimum: 0,
                //    maximum: 100
                // }
              }
            }
            
          },
           "opportunities":{
            "type": SchemaType.ARRAY,
            "description": "opportunities of the developers coding ability",
            "items":{
              "type": SchemaType.OBJECT,
              "properties": {
                "parameter": {
                  "type": SchemaType.STRING,
                  "description": "opportunities related parameter of the developers coding ability",
                   nullable: false
                },
                "description": {
                  "type": SchemaType.STRING,
                  "description": "opportunities related description of the developers coding ability related to the parameter",
                   nullable: false
                },
                // "score": {
                //   "type": SchemaType.NUMBER,
                //   "description": "opportunities related score of the developers coding ability under the parameter",
                //    nullable: false,
                //    minimum: 0,
                //    maximum: 100
                // }
              }
            }
            
          },
           "score":{
            "type": SchemaType.NUMBER,
            "description": "score of the developers coding ability between 1 and 100 according to the given codes of files according to performance, clean coding, solid principles, use of dates, array, statemenrs, loops, etc, ",
              minimum: 0,
              maximum: 100
            
          },
          solidPrinciples: {
                
            "type": SchemaType.OBJECT,
            "description":"judging the code quailty with given parameters",
            "properties": {
              "readability": {
                "type": SchemaType.NUMBER,
                "minimum": 1,
                "maximum": 100,
                nullable: false,
              },
              "maintainability": {
                "type": SchemaType.NUMBER,
                "minimum": 1,
                "maximum": 100,
                nullable: false,
              },
              "performance": {
                "type": SchemaType.NUMBER,
                "minimum": 1,
                "maximum": 100,
                nullable: false,
              },
              "proneness_to_error": {
                "type": SchemaType.NUMBER,
                "minimum": 1,
                "maximum": 100,
                nullable: false,
              },
              "test_coverage": {
                "type": SchemaType.NUMBER,
                "minimum": 1,
                "maximum": 100,
                nullable: false,
              },
              "modularity": {
                "type": SchemaType.NUMBER,
                "minimum": 1,
                "maximum": 100,
                nullable: false,
              },
              "scalability": {
                "type": SchemaType.NUMBER,
                "minimum": 1,
                "maximum": 100,
                nullable: false,
              },
              "complexity": {
                "type": SchemaType.NUMBER,
                "minimum": 1,
                "maximum": 100,
                nullable: false,
              },
              "adherence_to_solid_principles": {
                "type": SchemaType.NUMBER,
                "minimum": 1,
                "maximum": 100,
                nullable: false,
              },
              "documentation_quality": {
                "type": SchemaType.NUMBER,
                "minimum": 1,
                "maximum": 100,
                nullable: false,
              },
              
            },
      

          }
          
        }
    }
    const prompt = `Given below is an array of files with their code content.
    ${fileContents}
    
    Your task is to analyse the content of the above code and get insights on the developer's abilities to identify the strengths, weaknesses, opportunities and threats based on parameters like 
    handling complex logic, use of if statement switch cases statements, performance of the code, managing arrays, dates, use of destructuring, etc. 
    Your response of this analysis should be only in a json format such that it can be stored in a mongodb database. 
    I want to have such response for every instance like this so that after analysing n number of such codes of the developer over certain time 
    I should get a clear idea of the user's strengths, weaknesses, opportunities and threats and I should be able to recommend the developer where he/she can improve. 
    Also this json response should allow to quantify the coding ability of the developer so that I can get a score between 1 and 100 for these parameters and a total score . 
    The response should only be in json and not comments or explanatory text should be present. Please provide a response strictly in JSON format, adhering to the specified schema. No additional text or comments are allowed.
     `
    const simplePrompt = `Analyse the following code to get insights into developer's coding ability and structure the response accoding to the given response schema. Do not give any formatting markdowns like slash n in the json response text
    ${fileContents.map((file) => file.content).join("\n")}`;
    console.log("Simple prompt : ...... ", simplePrompt)
    const responseOfDeveloperCodingAbilityAnalysisFromGeminiPrompt = await this.getDeveloperCodingAbilityAnalysisFromGeminiPrompt(simplePrompt, schema);
    console.log("response of the dev coding ability analsysis", {userName,prNumber,analysis: JSON.parse(responseOfDeveloperCodingAbilityAnalysisFromGeminiPrompt)});
    const {strengths, weaknesses, threats, opportunities, score, solidPrinciples} = JSON.parse(responseOfDeveloperCodingAbilityAnalysisFromGeminiPrompt);
    const savedUserPrAnalysis = await this.userPrScoreRepo.create({userName,prNumber,analysis: {strengths, weaknesses, threats, opportunities}, score: {...solidPrinciples, score}});
    return savedUserPrAnalysis;
  } catch (error) {
    console.log(error.message);
    throw error;
  }
}

async getDeveloperCodingAbilityAnalysisFromGeminiPrompt(prompt, schema) {
  try {
    const genAI = new GoogleGenerativeAI(this.API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" ,
        generationConfig: {
        responseMimeType: "application/json",
        responseSchema:   schema}
      })
      const result = await model.generateContent(prompt);
      console.log("result.response of the dev coding ability analsysis", result.response.text());
      return result.response.text();
  } catch (error) {
    console.log(error.message);
    throw error;
  }
}

private readonly contentAnalsysisStructure = {
  
  strengths:[
    {
      parameter: "parameterName",
      description: "description of the parameter",
      score:80
    },
    {
      parameter: "...",
      description: "....",
      score:80
    }
  ],
  weaknesses:[],
  threats:[],
  opportunities:[],
  totalScore: 89,
  summary: {
    overallStrengthScore:67,
    overallWeaknessScore: 23,
    overallOpportunityScore: 45,
    overallThreatScore: 12,
    recommendations:[
      {areaOfImprovement: "...", suggestion: "..."},
      {areaOfImprovement: "...", suggestion: "..."}
    ]
  }
}

async getResponseFromGeminiPrompt(prompt) {
  try {
    const genAI = new GoogleGenerativeAI(this.API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.log(error.response.data.message);
  }
}
}


