.. Copyright 2010-2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.

   This work is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0
   International License (the "License"). You may not use this file except in compliance with the
   License. A copy of the License is located at http://creativecommons.org/licenses/by-nc-sa/4.0/.

   This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
   either express or implied. See the License for the specific language governing permissions and
   limitations under the License.

.. _cookbook:

##################
The |cdk| Cookbook
##################

This topic contains a number of "recipes" that describe how to perform some
common tasks with the |cdk|.

.. _cookbook_get_env:

How-To: Get Information about Your Environment
==============================================

To get your current account and region,
use the **env** property of the **StackProps** class,
such as shown in the following code example.

.. code-block:: ts

    const myStack = new HelloCdkStack(app, 'HelloCdkStack');

    // ...

    process.stderr.write("Account: ", myStack.env.account);
    process.stderr.write("Region: ", myStack.env.region);

.. _cookbook_is_service_supported:

How-To: Find out Whether a Service is Supported in the Current Region
=====================================================================

If you are attempting to run your app in a different region,
and aren't sure whether all of the services in your app are supported in that region,
use the ??? to find out whether they are supported.

The following example does not run if either |S3| or |LAM| is not supported in the
default region.

.. from java example at https://aws.amazon.com/blogs/developer/working-with-different-aws-regions/
   Region.getRegion(Regions.US_WEST_2).isServiceSupported(ServiceAbbreviations.Dynamodb);

.. code-block:: ts

    const myStack = new HelloCdkStack(app, 'HelloCdkStack');

    // ...

    const region = myStack.env.region;

    const s3Supported = ???.getRegion(region).isServeiceSupported(serviceAbbreviations.s3);
    const lamSupported = ???.getRegion(region).isServeiceSupported(serviceAbbreviations.lambda);

    if s3Supported && lamSupported {
      // Generate output
      process.stdout.write(app.run());
    }

.. _cookbook_define_stacks:

How-To: Define a Stack in a Specific Region
===========================================

To define a stack in a specific region,
use the **env** property of the **StackProps** class to set a region,
such as shown in the following code example.

.. code-block:: ts

    new HelloCdkStack(app, 'HelloCdkStack', {
      env: {
        region: 'us-west-2'
      }
    });

If you do not specify a region or account when you create a stack,
the |cdk| gets that information from your default credentials and region,
as described in :ref:`credentials`.

.. _cookbook_get_azs:

How-To: Get the List of Availibility Zones
==========================================

To get a list of the AZs for the current environment, use the
::py:class:`@aws-cdk/cdk.AvailabilityZoneProvider` class.

.. code-block:: ts

    // "this" refers to a parent Construct
    const zones: string[] = new AvailabilityZoneProvider(this).availabilityZones;

See :ref:`context` for further information.

.. _cookbook_using_cfn_template:

How-To: Use Resources from an Existing |CFN| Template
=====================================================

To access a resource that is defined in an existing |CFN| template,
use code like the following.
Note that you cannot use this method in an |l2| construct.

.. code-block:: ts

   import cdk = require("@aws-cdk/cdk");
   import fs = require("fs");

   new cdk.Include(this, "ExistingInfrastructure", {
      template: JSON.parse(fs.readFileSync("my-template.json").toString())
   });

The template, *my-template.json*, must define the |S3| bucket.

.. code-block:: json

   "S3Bucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
          ...
      }
   }

To access an attribute of the resource, such as the bucket's ARN,
use code like the following.

.. code-block:: ts

   const bucketArn = new cdk.FnGetAtt("S3Bucket", "Arn");

See :ref:`using_cfn_template` for further information.

