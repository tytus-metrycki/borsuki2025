# Borsuki 2025

A wedding website.

A simple example of an AWS setup for hosting a static webpage. The infra is defined via CDK and uses S3 for hosting, CloudFront as a CDN, Route 53 for DNS, and an ACM certificate for TLS.

For a small site with low traffic, costs are mainly domain registration and DNS hosting (as of 2026: [US$0.50/month per Route 53 hosted zone](https://aws.amazon.com/route53/pricing/) plus yearly domain registration).

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template



Serve website locally using:
```sh
python3 -m http.server -d static-website
```


To deploy
```sh
> export AWS_PROFILE=borsuk                                                
> cdk deploy
```
