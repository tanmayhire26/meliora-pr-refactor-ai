import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { GithubTrackService } from './github-track.service';
import axios from 'axios';
import { Request } from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

@Controller('github-track')
export class GithubTrackController {
  constructor(private readonly githubTrackService: GithubTrackService) {}
  private readonly baseUrl = 'https://api.github.com';
  private readonly token = "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";
  private readonly API_KEY = "AIzaSyD9L7RbsfJPNPxnEqro4iWMnzZkaW31qoU";
  private readonly owner = "tanmayhire26";
  private readonly repo = "cashflo";

 

   @Post('get-PR-data')
  async getPrData(
    @Req() req: Request
  ) {
    try {
      const eventType = req.headers['x-github-event'];
        console.log('Github event triggered event type = ', eventType, "req body of the event", req.body); 
                // const latestCommit = await this.githubTrackService.getLatestCommit(this.repo, req.body?.pull_request?.number ?? req.body?.number);
      
      // Extract the sender's username
      if (eventType === 'pull_request' && req.body.sender.login !== "tanmayhire"
        // req.body.pull_request.title !== "bot"
        // req.body.pull_request.user.login !== "tanmayhire" && senderUsername !== "tanmayhire"
      ) {
        
          const pullRequestData = req.body;
          console.log('Pull Request Event Received:', pullRequestData);        
          
         
          const pullNumber = pullRequestData?.number;
      //      const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/pulls/${pullNumber}.diff`;
      //      const response = await axios.get(url, {
      //   headers: {
      //     'Authorization': `token ${this.token}`,
      //     'Accept': 'application/vnd.github.v3.diff',
      //   },
      // });
      // console.log("Diff Data =============================================  ", JSON.stringify(response.data, null, 4));
      
      const urlFilesChanged = `${this.baseUrl}/repos/${this.owner}/${this.repo}/pulls/${pullNumber}/files`;
           const responseFilesChanged = await axios.get(urlFilesChanged, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3.diff',
        },
      });
      console.log("))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))   FILEs CHANMGED ))))))))))))))))))))))))))   ", responseFilesChanged);
       const filesChanged = responseFilesChanged.data; // This will contain the diff as text

      const fileContents = await Promise.all(filesChanged.map(async (file) => {
        // const content = await this.getFileContent(this.owner, this.repo, file.filename);
        // const qualityAnalysisResponse = await this.generateGeminiPromptForCodeQualityAndGetResponse({code_content: content});
        return { filename: file.filename, 
          // qualityAnalysis: JSON.stringify(JSON.parse(qualityAnalysisResponse)) 
        };
    }));

    // await this.githubTrackService.savePRAnalysisScores({userName: req.body?.sender?.login, fileContents, prNumber: pullNumber});
    const devAnalsysis = await this.githubTrackService.doCodingAbilityAnalysis({filesChanged, prNumber: pullNumber, userName: req.body?.sender?.login, branchName: pullRequestData?.pull_request?.head?.ref});
    console.log("dev analsysis done")
    /////////////////////////////////////////TEST CASES CREATION////////////////////////
    await this.githubTrackService.createTestCasesForPR(fileContents.map((f)=>f.filename), pullNumber, req.body.pull_request.head.ref);

    const refactoredFileContents = await Promise.all(fileContents.map(async (file) => {
      const content = await this.githubTrackService.getFileContent(file.filename, req.body.pull_request.head.ref);
      const refactoredContent = await this.getRefactoredCodeFromGeminiPrompt({codeContent: content});
      return { fileName: file.filename, content: refactoredContent };
    }))
    //github-service function that created a new branch, commits changes and creates a new PR


    console.log("File name and its contents in the changed files PR ", fileContents);
    console.log("File name and its quality analaysis", {userName: pullRequestData?.pull_request?.user?.login, fileContentsAnalysis: fileContents});
    console.log("Refactored content according to file ================================================================ ", refactoredFileContents);
 // Create a new branch
 let branchName = "bot-refactor-" + pullNumber + Date.now();
    await this.githubTrackService.createBranch(this.owner, this.repo, branchName);
    
//     // Commit changes
    await this.githubTrackService.commitChanges(this.owner, this.repo, branchName, refactoredFileContents);

//     // Create pull request
    await this.githubTrackService.createPullRequest(this.owner, this.repo, 'bot', 'This PR includes refactored files.', branchName, "master");
    
    return { message: 'Pull request created successfully.' };  
  } else if(eventType === 'pull_request_review_comment' && req.body.action === "created") {
    console.log("review comment created");
    const reviewCommentAddedData = req.body;
    console.log("Review comment added data == = = == = ", reviewCommentAddedData);
    await this.githubTrackService.handleReviewCommentAdded(reviewCommentAddedData, req.body.pull_request.head.ref);
  }

    } catch (error) {
      throw error
    }
  }

  async getFileContent(owner, repo, path) {
    try {
                const baseUrl = 'https://api.github.com';

       const url = `${baseUrl}/repos/${owner}/${repo}/contents/${path}`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3.raw',
      },
    });
    return response.data;
    } catch (error) {
      throw error;
    }
  }

  async generateGeminiPromptForCodeQualityAndGetResponse({code_content}) {
    try {
      const schema = {
        "type": SchemaType.OBJECT,
        "description":"judging the code quailty with given parameters",
        "properties": {
          "readability": {
            "type": SchemaType.NUMBER,
            "minimum": 1,
            "maximum": 100
          },
          "maintainability": {
            "type": SchemaType.NUMBER,
            "minimum": 1,
            "maximum": 100
          },
          "performance": {
            "type": SchemaType.NUMBER,
            "minimum": 1,
            "maximum": 100
          },
          "proneness_to_error": {
            "type": SchemaType.NUMBER,
            "minimum": 1,
            "maximum": 100
          },
          "test_coverage": {
            "type": SchemaType.NUMBER,
            "minimum": 1,
            "maximum": 100
          },
          "modularity": {
            "type": SchemaType.NUMBER,
            "minimum": 1,
            "maximum": 100
          },
          "scalability": {
            "type": SchemaType.NUMBER,
            "minimum": 1,
            "maximum": 100
          },
          "complexity": {
            "type": SchemaType.NUMBER,
            "minimum": 1,
            "maximum": 100
          },
          "adherence_to_solid_principles": {
            "type": SchemaType.NUMBER,
            "minimum": 1,
            "maximum": 100
          },
          "documentation_quality": {
            "type": SchemaType.NUMBER,
            "minimum": 1,
            "maximum": 100
          },
          // "agg_score": {
          //   "type": SchemaType.NUMBER,
          //   "description": "Aggregate score of the above parameters"
          // },
          "total_score": {
            "type": SchemaType.NUMBER,
            "description": "Total score based on specific criteria"
          }
        },
        "required": [
          "readability", 
          "maintainability", 
          "performance", 
          "proneness_to_error", 
          "test_coverage", 
          "modularity", 
          "scalability", 
          "complexity", 
          "adherence_to_solid_principles", 
          "documentation_quality", 
          "total_score"
        ]
      };


      const genAI = new GoogleGenerativeAI(this.API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" ,
        generationConfig: {
        responseMimeType: "application/json",
        responseSchema:   schema}})

      const prompt = `You are assigned a task to judge the code quality based on the parameters given in the ${schema} with scores of 1 to 100. Also since I got this response as file content from a github api, ignore the slash n and inverted commas that indicate formatting.Also in the response only give me the json object according to specified schema and no other text : ${code_content}`;

      const result = await model.generateContent(prompt);
      console.log(result.response.text());
      return result.response.text();
    } catch (error) {
      throw error;
    }
  }

  async getQualityAnalysisObject (inputString) {
    try {

      const jsonPattern = /{[^}]*}/;
      const match = inputString.match(jsonPattern);

      if (match) {
          let jsonString = match[0];
          // Replace unquoted keys with quoted keys
          jsonString = jsonString.replace(/(\w+):/g, '"$1":');

          try {
              const jsonObject = JSON.parse(jsonString);
              console.log(jsonObject); // Output: { key: 'value' }
              return jsonObject;
          } catch (error) {
              console.error("Invalid JSON:", error);
              throw error;
          }
      } else {
          console.log("No JSON found in the string.");
          throw 'No JSON found in the string.'
      }

    } catch (error) {
      throw error;
    }
  }

  async getRefactoredCodeFromGeminiPrompt ({codeContent}) {
    try {
      console.log("Before refacrtoring content ------------------------------------------------------------------------------------------")
      const genAI = new GoogleGenerativeAI(this.API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"})

      const prompt = `Refactor the following code for best readability, maintainability, performance, and adherence to SOLID principles and give only the refactored code in response and no other explantory text. Please provide the refactored code without any Markdown formatting or additional comments. I also dont want the three backticks followed by typescript int he beginning and the again the three back ticks at the end of the generated response${codeContent}`;

      const result = await model.generateContent(prompt);
      console.log("Prompt done --------------------------------------------------------------- ")
      console.log("Reponse of the prompt ------------------------------------ result.response -------------------------",result.response);
      console.log("Reponse of the prompt ------------------------------------ result.response.text() -------------------------",result.response.text());

      // return result.response.text();
      return await this.cleanRefactorPromptReponse(result.response.text());
    } catch  (error) {
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


  @Post('create-pr-comment')
  async createPrComment(
    @Req() req: Request
  ) {
    try {
      const eventType = req.headers['x-github-event'];
      if(eventType === 'pull_request' && req.body.sender.login !== "tanmayhire") {
        console.log("Pull request Data = ", req.body);
        await this.githubTrackService.createPrComment(req.body);
        console.log("Pr comment added successfully by bot");
      }
    } catch (error) {
      console.log(error.message);
      throw error;
    }
  }

  @Post('dev-analysis')
  async getDeveloperCodingAbilityAnalysis(
    @Req() req: Request
  ) {
    try {
       const eventType = req.headers['x-github-event'];
        console.log('Github event triggered event type = ', eventType, "req body of the event", req.body); 
                
      if (eventType === 'pull_request' && req.body.sender.login !== "tanmayhire") {
         const pullRequestData = req.body;
          console.log('Pull Request Event Received:', pullRequestData);        
          const pullNumber = pullRequestData?.number;
          
          const urlFilesChanged = `${this.baseUrl}/repos/${this.owner}/${this.repo}/pulls/${pullNumber}/files`;
          const responseFilesChanged = await axios.get(urlFilesChanged, {
            headers: {
              'Authorization': `token ${this.token}`,
              'Accept': 'application/vnd.github.v3.diff',
            },
          });
          console.log("REveived respons efile changed.......................")
        const filesChanged = responseFilesChanged.data; 
        const devAnalsysis = await this.githubTrackService.doCodingAbilityAnalysis({filesChanged, prNumber: pullNumber, userName: req.body?.sender?.login, branchName: pullRequestData?.pull_request?.head?.ref});
        console.log("dev analysis = ", devAnalsysis);
        return devAnalsysis;

      }
    } catch (error) {
      console.log(error.message);
      throw error;
    }
  }
}


