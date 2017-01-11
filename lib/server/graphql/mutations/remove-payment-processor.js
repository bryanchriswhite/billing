'use strict';

const graphql = require('graphql');
const graphqlService = require('../index');
const paymentProcessorType = require('../types/payment-processor');
const stripe = require('../../vendor/stripe');
const STRIPE = require('../../../constants').PAYMENT_PROCESSORS.STRIPE;

const removePaymentProcessor = {
  type: paymentProcessorType,
  resolve: function(_, args) {
    return graphqlService.currentUser
      .then((user) => {
        const stripeProcessor = user.getPaymentProcessor('stripe');
        const customerId = stripeProcessor.data.customer.id;
        // TODO: Remove selected card instead of just default card
        const cardId = stripeProcessor.defaultPaymentMethod.id;
        return new Promise((resolve, reject) => {
          stripe.customers.deleteCard(
            customerId,
            cardId,
            function(err, confirmation) {
              if(err) {
                return reject(err);
              }
              const options = {
                user: user,
                customerId: customerId,
                stripeProcessor: stripeProcessor
              }
              return resolve(options);
            }
          );
        });
      })
      .then((options) => {
        return new Promise((resolve, reject) => {
          stripe.customers.retrieve(options.customerId, (err, customer) => {
            if (err) return reject(err);
            options.stripeProcessor.data.customer = customer;

            return options.stripeProcessor
              .save()
              .then(() => resolve(null));
          })
        })
      })
      .catch((err) => {
        console.log(err.stack)
        throw err;
      });
  }
};

module.exports = removePaymentProcessor;
