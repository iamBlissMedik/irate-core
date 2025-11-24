import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import CloudwatchTransport from "winston-cloudwatch";

// Daily rotating file transport
const dailyRotate = new DailyRotateFile({
  filename: "logs/%DATE%-combined.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "10m",
  maxFiles: "14d",
});

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console(), dailyRotate],
});

// Add CloudWatch transport in production
if (process.env.NODE_ENV === "production") {
  logger.add(
    new CloudwatchTransport({
      logGroupName: process.env.CLOUDWATCH_GROUP ?? "fintech-logs",
      logStreamName: process.env.CLOUDWATCH_STREAM ?? "audit-stream",
      awsRegion: process.env.AWS_REGION ?? "eu-west-1",
      jsonMessage: true,
    })
  );
}

export default logger;
