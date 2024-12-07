import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Distribution, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { HostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { HttpsRedirect } from 'aws-cdk-lib/aws-route53-patterns';

export class Borsuki2025Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Lookup an existing Route 53 hosted zone
    const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: 'borsuki2025.com',
    });

    const wwwSubdomain = `www.${hostedZone.zoneName}`;

    const certificate = new Certificate(this, 'SiteCertificate', {
      domainName: hostedZone.zoneName,
      subjectAlternativeNames: [
        wwwSubdomain,
      ],
      validation: CertificateValidation.fromDns(hostedZone),
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
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: [hostedZone.zoneName, wwwSubdomain],
      certificate: certificate,
      defaultRootObject: 'index.html',
    });

    // borsuki2025.com
    new ARecord(this, 'CloudfrontAliasRecord', {
      zone: hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(cloudfrontDistribution)),
    });

    // www.borsuki2025.com
    new ARecord(this, 'wwwSubdomainAliasRecord', {
      zone: hostedZone,
      recordName: wwwSubdomain,
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
