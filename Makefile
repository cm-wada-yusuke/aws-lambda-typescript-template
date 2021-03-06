SHELL = /usr/bin/env bash -xeuo pipefail

include Makevars

GIT_COMMIT := $(shell git log -n 1 --format=%h)
LAMBDA_TEMPLATES := $(sort $(notdir $(wildcard templates/lambda*.yaml)))
LAMBDA_TARGETS := $(patsubst lambda_%.yaml, %, $(LAMBDA_TEMPLATES))
LAMBDA_DEPLOY_TASK := $(addprefix deploy-, $(LAMBDA_TARGETS))
SECRETS := $(addprefix guard-, $(SECRET_PARAMETERS))


display:
	@echo $(TARGETS)
	@echo $(LAMBDA_DEPLOY_TASK)

clean:
	-rm -rf dist/
	-rm -rf layer_modules/
	-rm lambda_layer.zip
	-rm packaged-*.yaml
	-rm lambda_*.yaml
	-rm infra_*.yaml
	-rm layer.yaml
	-rm templates/*_lambda_common_parameters.yaml

push-params: guard-env guard-ns $(SSM_LAMBDA_PARAMETERS_DIR)/*-$(SSM_LAMBDA_PARAMETERS_FILE) $(SECRETS)
	@ jq -c --arg env $$env 'def addenv(f): f as $$value | "/" + $$env + "/lambda/" + $$value; \
	 .[] |  {Name:addenv(.Name), Value:.Value, Type:"String"} | tostring' $(SSM_LAMBDA_PARAMETERS_DIR)/$$env-$(SSM_LAMBDA_PARAMETERS_FILE) |\
      awk -v env=$$env -v ns=$$ns '{ print "aws ssm put-parameter --overwrite --cli-input-json " $$1}' |\
      sh
	@ aws ssm get-parameters-by-path --path /$${env}/lambda

generate-cfn-parameters: guard-env
	@npm run gen-params -- -e $${env}

layer: templates/layer.yaml guard-ns guard-env guard-layer generate-cfn-parameters
	mkdir -p layer_modules && \
	cp package.json layer_modules && \
	npm install --production --prefix layer_modules && \
	npm run archive-library && \
	aws s3 cp lambda_layer.zip s3://$${ns}-$${env}-$(S3_BUCKET)/lambda_layer_$${layer}.zip && \
	cat templates/layer.yaml templates/$${env}_lambda_common_parameters.yaml > layer.yaml && \
	aws cloudformation deploy \
		--template-file layer.yaml \
		--stack-name $${env}-lambda-layer  \
		--capabilities  CAPABILITY_NAMED_IAM CAPABILITY_IAM \
		--no-fail-on-empty-changeset \
		--parameter-overrides \
			CommitId=$(GIT_COMMIT) \
			LayerVersion=$${layer} \
			DeployBucketName=$${ns}-$${env}-$(S3_BUCKET) ;\

lambda: guard-env $(LAMBDA_DEPLOY_TASK)
	@echo $(TARGETS)
	@echo $(UPLOAD_TASK)
	@echo $(LAMBDA_DEPLOY_TASK)

lambda-%: templates/lambda_%.yaml guard-ns guard-env guard-layer generate-cfn-parameters
	@ if [ "${*}" = "" ]; then \
		echo "Target is not set"; \
		exit 1; \
	else \
		npm run build-lambda && \
		cat templates/lambda_${*}.yaml templates/$${env}_lambda_common_parameters.yaml > lambda_${*}.yaml && \
		stack_name_hyphen=$(subst _,-,$(*)) && \
		aws cloudformation package \
			--template-file lambda_${*}.yaml \
			--s3-bucket $${ns}-$${env}-$(S3_BUCKET) \
			--output-template-file packaged-${*}.yaml && \
		aws cloudformation deploy \
			--template-file packaged-${*}.yaml \
			--stack-name $${env}-$${stack_name_hyphen}-lambda  \
			--capabilities  CAPABILITY_NAMED_IAM CAPABILITY_IAM \
			--no-fail-on-empty-changeset \
			--parameter-overrides \
				CommitId=$(GIT_COMMIT) \
				LayerVersion=$${layer} \
				DeployBucketName=$${ns}-$${env}-$(S3_BUCKET) ;\
	fi

infra-%: templates/infra_%.yaml guard-ns guard-env generate-cfn-parameters
	@ if [ "${*}" = "" ]; then \
		echo "Target is not set"; \
		exit 1; \
	else \
		cat templates/infra_${*}.yaml templates/$${env}_lambda_common_parameters.yaml > infra_${*}.yaml && \
		stack_name_hyphen=$(subst _,-,$(*)) && \
		aws cloudformation deploy \
			--template-file infra_${*}.yaml \
			--s3-bucket $${ns}-$${env}-$(S3_BUCKET) \
			--stack-name $${env}-$${stack_name_hyphen}-resource  \
			--capabilities CAPABILITY_NAMED_IAM \
			--no-fail-on-empty-changeset ; \
	fi

guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi

.PHONY: \
	clean \
	format
