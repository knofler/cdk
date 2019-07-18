import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import iam = require("@aws-cdk/aws-iam");
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import { SubnetType } from '@aws-cdk/aws-ec2';
import { Bucket } from '@aws-cdk/aws-s3';


export class AframeworkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
       *
       * AWS::S3::Bucket
       *
    */
    const bucket = new Bucket(this, ' Aframeworkbucket');
    /**
      *
      * AWS::EC2::VPC
      *
    */
    const vpc = new ec2.Vpc(this, ' AframeworkVPC', {
      cidr: '10.1.0.0/21',
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 26,
          name: 'Ingress',
          subnetType: SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: 'Application',
          subnetType: SubnetType.PRIVATE
        },
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: SubnetType.ISOLATED
        }
      ],
    });
    /**
      *
      * AWS::ECS::Cluster
      *
    */
    const cluster = new ecs.Cluster(this, ' AframeworkCluster', {
      vpc: vpc
    });
    /**
      *
      * AWS::IAM::Role
      *
    */
    // ## Step-1 ::: Create trustStatement
    // const trustStatement = new iam.PolicyStatement({
    //   actions: ["sts.AssumeRole"],
    // });
    // ## Step-2 ::: Add Service Principal to trustStatement
    // trustStatement.addServicePrincipal("ecs.amazonaws.com");
    // ## Step-3 ::: Create trustPolicy
    // const trustPolicy = new iam.Policy(this, "TrustPolicy");
    // ## Step-4 ::: Add trustStatement to trustPolicy
    // trustPolicy.addStatements(trustStatement);



    // const medialiveRole = new iam.Role(this, 'MyRole', {
    //   assumedBy: new iam.CompositePrincipal(
    //     new iam.ServicePrincipal('ecs.amazonaws.com'),
    //     new iam.ArnPrincipal('arn:aws:iam::103365315157:role/MediaLiveAccessRole')
    //   )
    // });

    // ## Step-1 ::: Create ecsServicePolicyStatement
    const ECSRolePolicyStatement = new iam.PolicyStatement({
      actions: ['ec2:AttachNetworkInterface', 'ec2:CreateNetworkInterface', 'ec2:CreateNetworkInterfacePermission', 'ec2:DeleteNetworkInterface', 'ec2:DeleteNetworkInterfacePermission', 'ec2:Describe*', 'ec2:DetachNetworkInterface', 'elasticloadbalancing:DeregisterInstancesFromLoadBalancer', 'elasticloadbalancing:DeregisterTargets', 'elasticloadbalancing:Describe*', 'elasticloadbalancing:RegisterInstancesWithLoadBalancer', 'elasticloadbalancing:RegisterTargets'],
      resources: ["*"]
    });
    // ## Step-2 ::: Create ExecutionRolePolicyStatement
    const executionRolePolicyStatement = new iam.PolicyStatement({
      actions: ['ecr:GetAuthorizationToken'
        , 'ecr:BatchCheckLayerAvailability'
        , 'ecr:GetDownloadUrlForLayer'
        , 'ecr:BatchGetImage'
        , 'logs:CreateLogStream'
        , 'logs:PutLogEvents'],
      resources: ["*"]
    });
    // ## Step-7 ::: Create ECSPolicy
    const ECSRolePolicy = new iam.Policy(this, "ECSRolePolicy", {
      statements: [ECSRolePolicyStatement]
    })
    const executionRolePolicy = new iam.Policy(this, "ExecutionRolePolicy", {
      statements: [executionRolePolicyStatement]
    })
    // ## Step-8 ::: Instantiate Role class for trustPolicy and accessPolicy
    const ECSRole = new iam.Role(this, 'ECSRole', {
      // assumedBy: new iam.ServicePrincipal("ecs.amazonaws.com")
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('ecs.amazonaws.com'),
        new iam.ArnPrincipal('arn:aws:iam::103365315157:role/MediaLiveAccessRole')
      )
    });
    const executionRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com")
    });
    // ## Step-9 ::: Attach policies to roles, trustPolicy for sts:AssumeRole, and ECSPolicy for specific ECS releted policy for this stack.
    /*
      * Execution Role Policy Attachment to Role
    */
    executionRole.attachInlinePolicy(executionRolePolicy);
    /*
       * Task Role Policy Attachment to Role
    */
    ECSRole.attachInlinePolicy(ECSRolePolicy);
    /**
      *
      * AWS::ECS::Service
      *
    */
    // Create a load-balanced Fargate service and make it public
    const fargateServiceApp = new ecs_patterns.LoadBalancedFargateService(this, ' AframeworkFargateAppService', {
      containerName: "MediaLiveApp",
      containerPort: 3000,
      image: ecs.ContainerImage.fromRegistry("103365315157.dkr.ecr.ap-southeast-2.amazonaws.com/media-live-app:latest"), // Required
      cluster: cluster,  // Required
      cpu: 512, // Default is 256
      desiredCount: 1,  // Default is 1,
      environment: {
        ['API_URL']: 'http://localhost:8080'
      },
      loadBalancerType: ecs_patterns.LoadBalancerType.APPLICATION,
      memoryLimitMiB: 2048,  // Default is 512
      publicLoadBalancer: true,  // Default is false
      executionRole: executionRole,
      // taskRole: taskRole
    });

    const fargateServiceApi = new ecs_patterns.LoadBalancedFargateService(this, 'AframeworkFargateApiService', {
      containerName: "MediaLiveApi",
      containerPort: 8000,
      image: ecs.ContainerImage.fromRegistry("103365315157.dkr.ecr.ap-southeast-2.amazonaws.com/media-live-api:latest"), // Required
      cluster: cluster,  // Required
      cpu: 512, // Default is 256
      desiredCount: 1,  // Default is 1,
      environment: {
        ['API_URL']: 'http://localhost:8080'
      },
      loadBalancerType: ecs_patterns.LoadBalancerType.APPLICATION,
      memoryLimitMiB: 2048,  // Default is 512
      publicLoadBalancer: true,  // Default is false
      executionRole: executionRole,
      // taskRole: taskRole
    });

    // create a task definition with CloudWatch Logs
    // const logging = new ecs.AwsLogDriver(this, "AppLogging", {
    //   streamPrefix: "myapp",
    // })

    // const taskDef = new ecs.FargateTaskDefinition(this, "MyTaskDefinition", {
    //   memoryLimitMiB: 2048,
    //   cpu: 512
    // })

    // const fargate = new ecs.FargateService(this, 'MediaLiveFargate', {
    //   cluster: cluster,
    //   taskDefinition: taskDef
    // });

    // taskDef.addContainer("AppContainer", {
    //   image: ecs.ContainerImage.fromRegistry("103365315157.dkr.ecr.ap-southeast-2.amazonaws.com/media-live-app:latest"),
    //   logging,
    // })

    /**
      *
      * AWS::ApplicationAutoScaling::ScalableTarget
      *
    */
    // Setup AutoScaling policy
    const scalingApp = fargateServiceApp.service.autoScaleTaskCount({ maxCapacity: 2 });
    scalingApp.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
    });

    const scalingApi = fargateServiceApi.service.autoScaleTaskCount({ maxCapacity: 2 });
    scalingApi.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
    });

    // OUTPUT
    new cdk.CfnOutput(this, 'LoadBalancerAppDNS', { value: fargateServiceApp.loadBalancer.loadBalancerDnsName });
    new cdk.CfnOutput(this, 'LoadBalancerApiDNS', { value: fargateServiceApi.loadBalancer.loadBalancerDnsName });
  }
}

