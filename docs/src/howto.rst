.. Copyright 2010-2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.

   This work is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0
   International License (the "License"). You may not use this file except in compliance with the
   License. A copy of the License is located at http://creativecommons.org/licenses/by-nc-sa/4.0/.

   This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
   either express or implied. See the License for the specific language governing permissions and
   limitations under the License.

.. To-do: port the three existing, TypeScript-only examples to the other programming languages we support.

.. _how_to:

######################################
Performing Common Tasks With the |cdk|
######################################

This topic describes how to perform some common tasks with the |cdk|.
Each section starts with the question "How do I" and supplies an answer.
Note that there are often multiple ways of performing a task.
This topic describes the simplest, most straightforward way.

.. _how_to_use_cfn_template:

How do I use an Existing |CFN| Template?
========================================

The |cdk| provides a mechanism that you can use in your code to include an
existing |CFN| template in your app.

The following example includes the template *my-template.json* into the
existing app and gets the ARN of the bucket **mybucket** from the
template.

First make sure you have the |S3|, |IAM|, and ??? packages installed.

.. code-block:: js

    npm i -g

.. code-block:: js

    import cdk = require('@aws-cdk/cdk');
    import fs = require('fs');

    const myTemplate = fs.readFileSync('my-template.json').toString();

    new cdk.Include(this, 'ExistingInfra', {
        template: JSON.parse(myTemplate)
    });

    // To get the bucket's ARN:
    const bucketArn = new cdk.FnGetAtt('mybucket', 'Arn');

The *my-template.json' must have the following resource,
where **abcdwxyz** is the unique, 8-character hash that the |cdk| generates for the resource:

.. code-block:: json

   "TheBucketabcdwxyz": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
         "BucketName": "mybucket"
      }
   }

.. _how_to_add_a_stack:

How do I Add a Stack to My App?
===============================

To add a stack to your app,
create a new class that extends the
::py:class:`_aws-cdk_core.Stack` class,
as shown in the following example.

.. code-block:: js

   import { Stack, StackProps } from '@aws-cdk/core';
   // ...
   class HelloStack extends Stack {
      constructor(parent: App, name: string, props?: StackProps) {
         super(parent, name, props);
      }
   }

.. _how_to_create_stack_in_region:

How do I Create a Stack in a Specific Region?
=============================================

To create a stack in **us-west-2** in your app,
and set the **region** property of the **env**
member of the **StackProps** argument to your stack when creating it,
as shown in the following example.

.. code-block:: js

   new HelloStack(this, 'hello-cdk-us-west-2', {
      env: {
         region: 'us-west-2'
   }});

.. _how_to_azs:

How do I Get the Availability Zones in a Region?
================================================

You can get the AZs in the current region by using the
::py:class:`_aws-cdk_core.AvailabilityZoneProvider` class,
as shown in the following example.

.. code-block:: js

   const zones: string[] = new AvailabilityZoneProvider(this).availabilityZones;

   for (let zone of zones) {
      // do somethning for each zone!
   }

.. _how_to_opt_out:

How do I Opt Out of Usage Tracking?
===================================

// What was the innocuous name we gave this?

.. _how_to_write_secrets:

How do I Store my Secret Data?
==============================

Info on storing/retrieving secret data?

.. code-block:: sh

   cdk write-secret STACK Username=NAME Password=PASSWORD

.. _how_to_use_cfn_template_different_region:

How do I use an Existing |CFN| Template in a Different Region?
==============================================================

Is this even possible? Planned?

.. _how_to_create_nested_stack:

How do I Create a Nested Stack?
===============================

If we create a section in another topic,
should this just be a link to that section?

.. _how_to_see_my_metrics:

How do I See my Metrics?
========================

If we gather data, do we think users will want to see it?

.. _how_to_tag_resources:

How do I Tag my Resources?
==========================

and use that info

.. _how_to_add_runtime:

How do I Access Deploy Time Values?
===================================

SSM? Environent variables? cdk.json?

.. _how_to_integrate_with_my_ide:

How do I Use the |cdk| in My IDE?
=================================

Which IDEs should be support with setup instructions?
Paul's already got Cloud9 going,
what about VS Code, Eclipse, NetBeans, Visual Studio?

.. _how_to_cross_accounts:

How do I Work Across Accounts?
==============================

Question from a user:

How can I trigger a Lambda function running in a VPC in Account A
from an SNS topic in Account B?

.. _how_to_cross_regions:

How do I Work Across Regions?
=============================

Related: How to ensure service is available in a region.

.. _how_to_debug:

How do I Debug my |cdk| App?
============================

Tools & Techniques, logging, ???

.. _how_to_estimate_costs:

How do I Estimate my Stack's Cost?
==================================

Or is this a CFN issue?

.. _how_to_share_resources:

How do I Share Resources Between Stack?
=======================================

Or other constructs?

.. _how_to_create_large_apps:

How do I Create a Large-Scale APP?
==================================

// Probably not just a how-to, but a section in a topic or an entire topic?

.. _how_to_overcome_200_limit:

How do I Overcome the |CFN| 200 Resource Limit?
===============================================

Related to sub-stacks?

.. _how_to_request_service_l2:

How do I Request an |l2| Construct?
===================================

Since we won't have 100% coverage at GA,
what's the recommended way for users to ask for a missing |l2| construct?
GitHub PR/Issue?

.. _how_to_link_lambda_code:

How do I Link the Code for a Lambda Function to an AWS Lambda Resource?
=======================================================================

Inquiring minds want to know.

.. _how_to_transition:

How do I Port My |CFN| Template to the |cdk|?
=============================================

We should map out a couple of scenarios:

- Leave existing templates alone and add new functionality using the |cdk|.

- Refactor existing templates into opinionated constructs where possible.

- ???

.. _how_to_modify_l2:

How do I Modify an |l2| Construct?
==================================

For example, before we supported AES256 in S3,
how would the user get that functionality?
Fork our S3 |l2| construct and make a change?

.. _how_to_create_l3:

How do I Create a |l3| Library?
===============================

We used to have Goldberg as a proof of concept.
Do we have a replacement?

I don't see |l3| in the glossary.
Is that by design?

.. _how_to_ensure_service_is_available:

How do I Ensure a Service is Available?
=======================================

Some services/features are not available in certain regions.
How can the user know whether they've selected the right region?

.. _how_to_use_metrics_as_guardrail:

How do I Use Metrics as Guardrails?
===================================

I don't want to inadvertently create enormous cost.

.. _how_to_:

How do I ?
========================================
