import * as AWS from 'aws-sdk';
import { GetParametersByPathRequest, Parameter } from 'aws-sdk/clients/ssm';
import * as Commander from 'commander';
import * as fs from 'fs';
import * as jsyaml from 'js-yaml';
import * as util from 'util';

const SsmRegion = 'ap-northeast-1';

export class MakeSsmParameters {
    constructor() {
    }

    public async generateCfnParametersFile(): Promise<void> {

        // get environment from cli option.
        const env = this.getEnvOption();

        // Get CFn base data array from file.
        const fixedParameters = await this.getFixedParameters(env);

        // Get CFn base data array from ssm(parameter storeForAvailableMissions).
        const ssmParameters = await this.getSsmParameters(env);

        // convert Cfn base data to common Key-Value data.
        const cfnParametersFromFile: ICfnKeyValue[] = fixedParameters.map(this.convertFixedParameterToCfnParameter);
        const cfnParametersFromSsm: ICfnKeyValue[] = ssmParameters.map(this.convertSsmParameterToCfnParameter);
        const cfnParameters = {
            Parameters:
                cfnParametersFromFile.concat(cfnParametersFromSsm).reduce((map: ICfnParameter, obj) => {
                    map[obj.Key] = obj.Value;
                    return map;
                }, {}),
        };

        // Write concat data
        const outPath = `templates/${env}_lambda_common_parameters.yaml`;
        const outData = jsyaml.safeDump(cfnParameters);
        console.log(outData);
        await util.promisify(fs.writeFile)(outPath, outData, 'utf8');
    }

    private getEnvOption(): string {
        Commander.version('0.0.1')
            .option('-e, --env [env]', 'AWS environment name. ex: itg, stg, prd...')
            .parse(process.argv);

        if (process.argv.length < 3) {
            Commander.help();
        }
        return Commander.env;
    }

    private async getSsmParameters(env: string): Promise<Parameter[]> {

        const SSM = new AWS.SSM({region: SsmRegion});
        const parameters: GetParametersByPathRequest = {
            Path: `/${env}/lambda`,
            Recursive: true,
            WithDecryption: true,
            MaxResults: 2,
        };

        let result: Parameter[] = [];

        do {
            const response = await SSM.getParametersByPath(parameters).promise();
            parameters.NextToken = response.NextToken;
            if (response.Parameters) {
                result = result.concat(response.Parameters);
            }

        } while (parameters.NextToken);

        return result;

    }

    private convertSsmParameterToCfnParameter(p: Parameter): ICfnKeyValue {
        const parameterName = p.Name!.split('/').slice(-1)[0];
        return {
            Key: parameterName,
            Value: {
                Type: 'AWS::SSM::Parameter::Value<String>',
                Default: p.Name!,
            },
        };
    }

    private async getFixedParameters(env: string): Promise<IFixedParameter[]> {
        const path = `environments/${env}-fixed-variables.json`;
        const jsonString: string = await util.promisify(fs.readFile)(path, 'utf8');
        return JSON.parse(jsonString);
    }

    private convertFixedParameterToCfnParameter(f: IFixedParameter): ICfnKeyValue {
        return {
            Key: f.Name,
            Value: {
                Type: 'String',
                Default: f.Value,
            },
        };
    }

}

interface ICfnKeyValue {
    Key: string;
    Value: {
        Type: string;
        Default: string;
    };
}

interface ICfnParameter {
    [key: string]: {
        Type: string;
        Default: string;
    };
}

interface IFixedParameter {
    Name: string;
    Value: string;
}

new MakeSsmParameters().generateCfnParametersFile().then().catch();
