import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { GithubTrackService } from './github-track.service';
import { CreateGithubTrackDto } from './dto/create-github-track.dto';
import { UpdateGithubTrackDto } from './dto/update-github-track.dto';
import axios from 'axios';
import { Request } from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

@Controller('github-track')
export class GithubTrackController {
  constructor(private readonly githubTrackService: GithubTrackService) {}
  private readonly baseUrl = 'https://api.github.com';
  private readonly token = process.env.GITHUB_TOKEN;
  private readonly API_KEY = process.env.GEMINI_API_KEY;

 

   @Post('get-PR-data')
  async getPrData(
    @Req() req: Request
  ) {
    try {
      const eventType = req.headers['x-github-event'];
      if (eventType === 'pull_request' && req.body.pull_request.title !== "bot") {
          const pullRequestData = req.body;
          console.log('Pull Request Event Received:', pullRequestData);         
          const baseUrl = 'https://api.github.com';
          const owner = "tanmayhire26";
          const repo="cashflo";
          const pullNumber = pullRequestData?.number;
           const url = `${baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}.diff`;
           const response = await axios.get(url, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3.diff',
        },
      });
      // console.log("Diff Data =============================================  ", JSON.stringify(response.data, null, 4));
      
      const urlFilesChanged = `${baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/files`;
           const responseFilesChanged = await axios.get(urlFilesChanged, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3.diff',
        },
      });
      // console.log("))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))   FILEs CHANMGED ))))))))))))))))))))))))))   ", responseFilesChanged);
       const filesChanged = responseFilesChanged.data; // This will contain the diff as text

      const fileContents = await Promise.all(filesChanged.map(async (file) => {
        const content = await this.getFileContent(owner, repo, file.filename);
        const qualityAnalysisResponse = await this.generateGeminiPromptForCodeQualityAndGetResponse({code_content: content});
        return { filename: file.filename, qualityAnalysis: JSON.stringify(JSON.parse(qualityAnalysisResponse)) };
    }));

    const refactoredFileContents = await Promise.all(fileContents.map(async (file) => {
      const content = await this.getFileContent(owner, repo, file.filename);
      const refactoredContent = await this.getRefactoredCodeFromGeminiPrompt({codeContent: content});
      return { fileName: file.filename, content: refactoredContent };
    }))
    //github-service function that created a new branch, commits changes and creates a new PR


    console.log("File name and its contents in the changed files PR ", fileContents);
    console.log("File name and its quality analaysis", {userName: pullRequestData?.pull_request?.user?.login, fileContentsAnalysis: fileContents});
    console.log("Refactored content according to file ================================================================ ", refactoredFileContents);
 // Create a new branch
 let branchName = "bot-refactor-" + pullNumber;
    await this.githubTrackService.createBranch(owner, repo, branchName);
    
//     // Commit changes
    await this.githubTrackService.commitChanges(owner, repo, branchName, refactoredFileContents);

//     // Create pull request
    await this.githubTrackService.createPullRequest(owner, repo, 'bot', 'This PR includes refactored files.', branchName, "master");
    
    return { message: 'Pull request created successfully.' };  
  }

    } catch (error) {
      throw error
    }
  }

  async getFileContent(owner, repo, path) {
    try {
                const baseUrl = 'https://api.github.com';

       const url = `${baseUrl}/repos/${owner}/${repo}/contents/${path}`;
      //  console.log("path.............................", path);
    const response = await axios.get(url, {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3.raw',
      },
    });
    console.log("1 File content changed ", response.data);
    console.log("typeof TYPE OF file content retrieved from github == == == == ==", typeof response.data);
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
          "agg_score": {
            "type": SchemaType.NUMBER,
            "description": "Aggregate score of the above parameters"
          },
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
          "agg_score", 
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
}


