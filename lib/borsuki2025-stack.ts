import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { HostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';

export class Borsuki2025Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Lookup an existing Route 53 hosted zone
    const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: 'borsuki2025.com',
    });

    // Create an ACM certificate for the domain
    const certificate = new Certificate(this, 'SiteCertificate', {
      domainName: hostedZone.zoneName,
      validation: CertificateValidation.fromDns(hostedZone), // Automatically validates via Route 53
    });

    if (props?.env === undefined) {
      throw new Error("Env is undefined. Pls fix.");
    }
    // S3 bucket for hosting the static website
    const siteBucket = new Bucket(this, 'SiteBucket', {
      bucketName: `borsuki-bucket-${props?.env?.account}-${props?.env?.region}`,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY, // Remove the bucket when the stack is destroyed (useful for testing)
      autoDeleteObjects: true, // Automatically delete all objects (useful for testing)
    });

    // CloudFront distribution with TLS certificate and S3 origin
    const cloudfrontDistribution = new Distribution(this, 'SiteDistribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(siteBucket),
      },
      domainNames: [hostedZone.zoneName],
      certificate: certificate,
      defaultRootObject: 'index.html',
    });

    new ARecord(this, 'CloudfrontAliasRecord', {
      zone: hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(cloudfrontDistribution)),
    });

    // Deploy the website files to the S3 bucket
    new BucketDeployment(this, 'DeployWebsite', {
      sources: [Source.asset('./static-website')],
      destinationBucket: siteBucket,
      distribution: cloudfrontDistribution,
    });

    // Output the website URL
    new CfnOutput(this, 'SiteURL', {
      value: `https://${hostedZone.zoneName}`,
    });
  }
}
