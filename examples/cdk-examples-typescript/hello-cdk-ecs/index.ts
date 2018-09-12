import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import cdk = require('@aws-cdk/cdk');

class BonjourECS extends cdk.Stack {
    constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
        super(parent, name, props);

        // For better iteration speed, it might make sense to put this VPC into
        // a separate stack and import it here. We then have two stacks to
        // deploy, but VPC creation is slow so we'll only have to do that once
        // and can iterate quickly on consuming stacks. Not doing that for now.
        const vpc = new ec2.VpcNetwork(this, 'MyVpc', {
            maxAZs: 2
        });

        const cluster = new ecs.Cluster(this, 'DemoCluster', {
            vpc
        });

        // name, image, cpu, memory, port (with default)
        //
        // Include in constructs:
        //   - networking - include SD, ALB
        //   - logging - cloudwatch logs integration? talk to nathan about 3rd
        //     party integrations - aggregated logging across the service
        //     (instead of per task). Probably prometheus or elk?
        //   - tracing aws-xray-fargate - CNCF opentracing standard - jaeger,
        //     zipkin.
        //   - so x-ray is a container that is hooked up to sidecars that come
        //     with the application container itself
        //   - autoscaling - application autoscaling (Fargate focused?)

        const taskDef = new ecs.TaskDefinition(this, "MyTD", {
            family: "ecs-task-definition",
            containerDefinitions: [
                {
                    name: "web",
                    image: "amazon/amazon-ecs-sample",
                    cpu: 1024,
                    memory: 512,
                    essential: true
                }
            ]
        });

        new ecs.Service(this, "Service", {
            cluster: cluster.clusterName,
            taskDefinition: taskDef.taskDefinitionArn,
            desiredCount: 1,
        });
    }
}

const app = new cdk.App(process.argv);

new BonjourECS(app, 'GoedeMorgen');

process.stdout.write(app.run());
