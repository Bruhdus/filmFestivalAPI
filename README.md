# SENG365 Assignment 1 API Server (Film Festival)

## Running locally

1. Use `npm install` to populate the `node_modules/` directory with up-to-date packages.
2. Create a file called `.env`, following the instructions in the section below.
3. Go to https://dbadmin.csse.canterbury.ac.nz and create a database with the name that you set in the `.env` file.
2. Run `npm run start` or `npm run debug` to start the server.
3. The server will be accessible on `localhost:4941`.

### `.env` file

Create a `.env` file in the root directory of this project including the following information (note that you will need
to create the database first in phpMyAdmin):

```
SENG365_MYSQL_HOST=db2.csse.canterbury.ac.nz
SENG365_MYSQL_USER={your usercode}
SENG365_MYSQL_PASSWORD={your password}
SENG365_MYSQL_DATABASE={a database starting with your usercode then an underscore}
```

For example:

```
SENG365_MYSQL_HOST=db2.csse.canterbury.ac.nz
SENG365_MYSQL_USER=abc123
SENG365_MYSQL_PASSWORD=password
SENG365_MYSQL_DATABASE=abc123_s365
```

## Some notes about endpoint status codes

The api spec provides several status codes that each endpoint can return. Apart from 500 'Internal Server Error' and
501 'Not Implemented' each of these represents a flow that may be tested. Hopefully from the labs you have seen these
status codes before and have an understanding of what each represents. A brief overview is provided in the table below.

| Status Code | Status Message        | Description                                                                   | Example                                                |
|:------------|-----------------------|-------------------------------------------------------------------------------|--------------------------------------------------------|
| 200         | OK                    | Request completed successfully                                                | Successfully get films                                 |
| 201         | Created               | Resource created successfully                                                 | Successfully create a film                             |
| 400         | Bad Request           | The request failed due to client error                                        | Creating a film without a request body                 |
| 401         | Unauthorised          | The requested failed due invalid authorisation                                | Creating a film without authorisation header           |
| 403         | Forbidden             | The request is refused by the server                                          | Editing a film after a review has been placed          |
| 404         | Not Found             | No matching resource was found on the server                                  | Trying to view a film that doesn't exist (i.e. 999999) |
| 500         | Internal Server Error | The request causes an error and cannot be completed                           |                                                        |
| 501         | Not Implemented       | The request can not be completed because the functionality is not implemented |                                                        |

<b>Note:</b> In some cases we will accept more than one status code as correct, the case for this is when a user asks to
complete a forbidden action on a resource that does not exist. This is because the response depends on the order of
operations, if you check the resource is missing first then a 404 makes sense, if you check whether a user is 'allowed'
to complete the action first a 403 makes sense. In a proper application, you may also think about which one of these
responses is better, and gives away the least information about the system to the client.
